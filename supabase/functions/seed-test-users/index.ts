import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: Record<string, string> = {};

    // Helper to create user with password
    async function createTestUser(
      email: string,
      password: string,
      full_name: string,
      role: string,
      extra: Record<string, string> = {}
    ) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === email);
      if (existing) {
        // Update profile links if needed
        if (Object.keys(extra).length > 0) {
          await supabaseAdmin.from("profiles").update(extra).eq("id", existing.id);
        }
        results[role] = `${email} (already exists)`;
        return existing.id;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role },
      });
      if (error) throw new Error(`Failed to create ${role}: ${error.message}`);

      // Update profile with extra fields
      if (Object.keys(extra).length > 0) {
        await supabaseAdmin.from("profiles").update(extra).eq("id", data.user.id);
      }

      results[role] = `${email} / ${password}`;
      return data.user.id;
    }

    // 1. Admin (may already exist)
    await createTestUser(
      "admin@gothurt.test",
      "Test1234!",
      "Admin User",
      "admin"
    );

    // 2. Care Manager
    await createTestUser(
      "cm@gothurt.test",
      "Test1234!",
      "Sarah Chen",
      "care_manager"
    );

    // 3. Attorney - linked to Rivera & Associates
    await createTestUser(
      "attorney@gothurt.test",
      "Test1234!",
      "Maria Rivera",
      "attorney",
      { firm_id: "3861d5cc-2eaf-432c-9d8a-0f13447dca75" }
    );

    // 4. Provider - linked to Tampa Bay Pain Specialists
    await createTestUser(
      "provider@gothurt.test",
      "Test1234!",
      "Dr. Tampa Pain",
      "provider",
      { provider_id: "06362202-6210-485a-b33c-4d7ed849a6c3" }
    );

    // 5. Patient - create and link to case GHN-2026-001
    const patientId = await createTestUser(
      "patient@gothurt.test",
      "Test1234!",
      "Maria Santos",
      "patient"
    );

    // Link patient profile to case
    const { data: existingPatientProfile } = await supabaseAdmin
      .from("patient_profiles")
      .select("id")
      .eq("profile_id", patientId)
      .maybeSingle();

    if (!existingPatientProfile) {
      await supabaseAdmin.from("patient_profiles").insert({
        profile_id: patientId,
        case_id: "ac1f1d55-6de6-4a72-98c4-2decab520449",
        preferred_language: "English",
      });
    } else {
      await supabaseAdmin
        .from("patient_profiles")
        .update({ case_id: "ac1f1d55-6de6-4a72-98c4-2decab520449" })
        .eq("profile_id", patientId);
    }

    // 6. Funder - create funder profile too
    const funderId = await createTestUser(
      "funder@gothurt.test",
      "Test1234!",
      "Capital Funding LLC",
      "funder"
    );

    // Create funder_profile if not exists
    const { data: existingFunder } = await supabaseAdmin
      .from("funder_profiles")
      .select("id")
      .eq("profile_id", funderId)
      .maybeSingle();

    if (!existingFunder) {
      await supabaseAdmin.from("funder_profiles").insert({
        profile_id: funderId,
        company_name: "Capital Funding LLC",
        contact_name: "Test Funder",
        email: "funder@gothurt.test",
        funding_capacity_min: 5000,
        funding_capacity_max: 100000,
        accredited_investor: true,
      });
    }

    // 7. Marketer
    const marketerId = await createTestUser(
      "marketer@gothurt.test",
      "Test1234!",
      "Jake Marketer",
      "marketer"
    );

    const { data: existingMarketer } = await supabaseAdmin
      .from("marketer_profiles")
      .select("id")
      .eq("profile_id", marketerId)
      .maybeSingle();

    if (!existingMarketer) {
      await supabaseAdmin.from("marketer_profiles").insert({
        profile_id: marketerId,
        company_name: "Leads Pro LLC",
        marketing_channels: ["Social Media", "Google Ads"],
        geographic_focus: ["FL", "TX"],
        pi_experience: true,
      });
    }
    return new Response(JSON.stringify({ success: true, accounts: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
