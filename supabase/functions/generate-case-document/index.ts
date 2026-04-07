import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "care_manager", "provider"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      case_id,
      document_type,
      merge_data,
      receiving_provider_id,
      referring_provider_id,
      additional_notes,
      send_email,
      receiving_provider_email,
    } = body;

    if (!case_id || !document_type || !merge_data) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["referral_letter", "imaging_requisition", "work_treatment_note"];
    if (!validTypes.includes(document_type)) {
      return new Response(JSON.stringify({ error: "Invalid document type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate PDF content as HTML
    const htmlContent = generateDocumentHtml(document_type, merge_data);

    // Store as HTML file (PDF generation can be enhanced later with a PDF service)
    const fileName = `case-docs/${case_id}/${document_type}-${Date.now()}.html`;
    const htmlBlob = new TextEncoder().encode(htmlContent);

    const { error: uploadError } = await adminClient.storage
      .from("documents")
      .upload(fileName, htmlBlob, {
        contentType: "text/html",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create case_documents record
    const docRecord: Record<string, unknown> = {
      case_id,
      document_type,
      receiving_provider_id: receiving_provider_id || null,
      referring_provider_id: referring_provider_id || null,
      generated_by: user.id,
      additional_notes: additional_notes || null,
      merge_data,
      file_path: fileName,
      status: send_email ? "sent" : "generated",
      sent_at: send_email ? new Date().toISOString() : null,
    };

    const { error: insertError } = await adminClient
      .from("case_documents")
      .insert(docRecord);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save document record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If send_email is true and we have an email, enqueue the email
    if (send_email && receiving_provider_email) {
      try {
        const typeLabels: Record<string, string> = {
          referral_letter: "Referral Letter",
          imaging_requisition: "Imaging Requisition",
          work_treatment_note: "Work/Treatment Note",
        };

        const emailPayload = {
          to: receiving_provider_email,
          subject: `${typeLabels[document_type]} — ${merge_data.patient_name} (Case #${merge_data.case_number})`,
          html: htmlContent,
        };

        await adminClient.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: JSON.stringify(emailPayload),
        });
      } catch (emailErr) {
        console.error("Email enqueue error:", emailErr);
        // Don't fail the whole request if email fails
      }
    }

    return new Response(JSON.stringify({ success: true, file_path: fileName }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateDocumentHtml(type: string, d: Record<string, any>): string {
  const styles = `
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #333; max-width: 700px; margin: 40px auto; padding: 20px; }
      h1 { font-size: 16px; text-align: center; margin-bottom: 20px; }
      .header { margin-bottom: 20px; }
      .section { margin-bottom: 16px; }
      .label { font-weight: bold; }
      .signature { margin-top: 30px; }
      .divider { border-top: 1px solid #ccc; margin: 16px 0; }
    </style>
  `;

  if (type === "referral_letter") {
    return `<!DOCTYPE html><html><head>${styles}</head><body>
      <div class="header">
        <p class="label">${d.referring_provider_practice}</p>
        <p>${d.referring_provider_address}</p>
        <p>Phone: ${d.referring_provider_phone} | Fax: ${d.referring_provider_fax}</p>
      </div>
      <p>Date: ${d.today_date}</p>
      <div class="section">
        <p>To: ${d.receiving_provider_name}<br>${d.receiving_provider_practice}<br>${d.receiving_provider_address}</p>
      </div>
      <div class="section">
        <p><strong>Re: Patient Referral</strong><br>
        Patient: ${d.patient_name}<br>
        DOB: ${d.patient_dob}<br>
        Date of Injury: ${d.patient_dol}<br>
        Case #: ${d.case_number}</p>
      </div>
      <p>Dear ${d.receiving_provider_name},</p>
      <p>I am referring the above patient to your office for evaluation and treatment related to injuries sustained on ${d.patient_dol}. The patient is currently under my care and I believe your expertise is warranted for their condition.</p>
      <p><strong>Injury Type:</strong> ${d.injury_type}</p>
      <p><strong>Attorney on File:</strong> ${d.attorney_name} — ${d.attorney_firm}<br>Phone: ${d.attorney_phone}</p>
      <p>Please contact our office if you have any questions regarding this referral or need additional information.</p>
      ${d.additional_notes ? `<p>${d.additional_notes}</p>` : ""}
      <div class="signature">
        <p>Sincerely,</p>
        <p>${d.referring_provider_name}<br>${d.referring_provider_practice}<br>NPI: ${d.referring_provider_npi}<br>Phone: ${d.referring_provider_phone}<br>Fax: ${d.referring_provider_fax}</p>
      </div>
    </body></html>`;
  }

  if (type === "imaging_requisition") {
    const imagingList = (d.imaging_types || []).join(", ") + (d.imaging_other ? ` — ${d.imaging_other}` : "");
    return `<!DOCTYPE html><html><head>${styles}</head><body>
      <h1>IMAGING REQUISITION</h1>
      <p>Date: ${d.today_date}</p>
      <div class="section">
        <p class="label">Ordering Provider:</p>
        <p>${d.referring_provider_name}<br>${d.referring_provider_practice}<br>${d.referring_provider_address}<br>Phone: ${d.referring_provider_phone} | Fax: ${d.referring_provider_fax}<br>NPI: ${d.referring_provider_npi}</p>
      </div>
      <div class="divider"></div>
      <div class="section">
        <p class="label">Patient Information:</p>
        <p>Name: ${d.patient_name}<br>DOB: ${d.patient_dob}<br>Phone: ${d.patient_phone}<br>Address: ${d.patient_address}</p>
      </div>
      <div class="section">
        <p class="label">Clinical Information:</p>
        <p>Date of Injury: ${d.patient_dol}<br>Injury Type: ${d.injury_type}<br>Case #: ${d.case_number}</p>
      </div>
      <div class="divider"></div>
      <div class="section">
        <p class="label">Imaging Requested:</p>
        <p>${imagingList}</p>
      </div>
      <div class="section">
        <p class="label">Body Part(s) / Region:</p>
        <p>${d.body_parts || "—"}</p>
      </div>
      <div class="section">
        <p class="label">Clinical Indication / Reason for Exam:</p>
        <p>${d.clinical_indication || "—"}</p>
      </div>
      <div class="divider"></div>
      <p><strong>Send Results To:</strong> ${d.referring_provider_name} — Fax: ${d.referring_provider_fax}</p>
      <p><strong>Attorney on File:</strong> ${d.attorney_name} — ${d.attorney_firm}<br>Phone: ${d.attorney_phone}</p>
      ${d.additional_notes ? `<p>${d.additional_notes}</p>` : ""}
      <div class="signature">
        <p>Ordering Provider Signature: ________________________<br>${d.referring_provider_name}, ${d.referring_provider_practice}</p>
      </div>
    </body></html>`;
  }

  // work_treatment_note
  return `<!DOCTYPE html><html><head>${styles}</head><body>
    <h1>WORK/TREATMENT NOTE</h1>
    <p>Date: ${d.today_date}</p>
    <div class="section">
      <p class="label">Provider:</p>
      <p>${d.referring_provider_name}<br>${d.referring_provider_practice}<br>${d.referring_provider_address}<br>Phone: ${d.referring_provider_phone} | Fax: ${d.referring_provider_fax}</p>
    </div>
    <div class="divider"></div>
    <p>To Whom It May Concern:</p>
    <p>This letter is to confirm that ${d.patient_name} (DOB: ${d.patient_dob}) is a patient of ${d.referring_provider_practice}.</p>
    <p>The above patient will begin treating at our office for their injuries sustained in a motor vehicle collision on ${d.patient_dol}.</p>
    ${d.treatment_schedule ? `<p><strong>Treatment schedule:</strong> ${d.treatment_schedule}</p>` : ""}
    <p>The patient may need to be excused from work/school obligations during the course of treatment. Please accommodate their treatment schedule accordingly.</p>
    <p>If you have any questions or require additional documentation, please contact our office.</p>
    ${d.additional_notes ? `<p>${d.additional_notes}</p>` : ""}
    <div class="signature">
      <p>Sincerely,</p>
      <p>${d.referring_provider_name}<br>${d.referring_provider_practice}<br>Phone: ${d.referring_provider_phone}<br>Fax: ${d.referring_provider_fax}</p>
    </div>
  </body></html>`;
}
