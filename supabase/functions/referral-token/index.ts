import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const { action, token, status, notes } = await req.json();

    if (!token || typeof token !== "string" || token.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lookup referral by exact token match
    const { data: referral, error: fetchError } = await adminClient
      .from("referrals")
      .select("id, case_id, specialty, status, token_expires_at, responded_at, cases(case_number, attorneys(firm_name))")
      .eq("token", token)
      .maybeSingle();

    if (fetchError || !referral) {
      return new Response(JSON.stringify({ error: "Referral not found or link is invalid." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "lookup") {
      // Return only safe fields — no provider_id, case_id, etc.
      return new Response(JSON.stringify({
        id: referral.id,
        specialty: referral.specialty,
        status: referral.status,
        token_expires_at: referral.token_expires_at,
        responded_at: referral.responded_at,
        cases: referral.cases,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "respond") {
      if (!status || !["Accepted", "Declined"].includes(status)) {
        return new Response(JSON.stringify({ error: "Invalid status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check expiry
      if (referral.token_expires_at && new Date(referral.token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Referral has expired." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check already responded
      if (referral.responded_at || referral.status !== "Pending") {
        return new Response(JSON.stringify({ error: "Referral has already been responded to." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await adminClient
        .from("referrals")
        .update({
          status,
          responded_at: new Date().toISOString(),
          response_notes: notes || null,
        })
        .eq("id", referral.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to submit response." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
