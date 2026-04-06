import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { case_id, case_number, patient_name, attorney_name, reason, provider_id } = await req.json();

    if (!case_id || !case_number) {
      return new Response(JSON.stringify({ error: "case_id and case_number required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify all admins and care managers
    const { data: staff } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["admin", "care_manager"]);

    const notifications = (staff || []).map((s: any) => ({
      recipient_id: s.id,
      title: "Case Dropped by Attorney",
      message: `${attorney_name || "Attorney"} dropped case ${case_number} (${patient_name}). Reason: ${reason || "Not specified"}`,
      link: `/cases/${case_id}`,
    }));

    // Notify the provider on the case if any
    if (provider_id) {
      const { data: providerProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("provider_id", provider_id);

      for (const pp of providerProfiles || []) {
        notifications.push({
          recipient_id: pp.id,
          title: "Case Dropped by Attorney",
          message: `Attorney dropped case ${case_number} (${patient_name}). Please contact care management for next steps.`,
          link: `/cases/${case_id}`,
        });
      }
    }

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    // Queue email notifications to admin team
    try {
      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          template: "case_dropped",
          case_number,
          patient_name,
          attorney_name: attorney_name || "Unknown",
          reason: reason || "Not specified",
        },
      });
    } catch (e) {
      console.warn("Email queue failed (non-blocking):", e);
    }

    return new Response(JSON.stringify({ success: true, notifications_sent: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
