import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { case_id, tone, multiplier, additional_damages } = await req.json();
    if (!case_id) return new Response(JSON.stringify({ error: "case_id required" }), { status: 400, headers: corsHeaders });

    // Fetch all case data
    const [caseRes, chargesRes, apptsRes, recordsRes, liensRes, policyRes, colossusRes, patientRes] = await Promise.all([
      supabase.from("cases").select("*, attorneys(firm_name, contact_name, email), providers(name, specialty)").eq("id", case_id).single(),
      supabase.from("charges").select("*").eq("case_id", case_id),
      supabase.from("appointments").select("*, providers(name)").eq("case_id", case_id).order("scheduled_date"),
      supabase.from("records").select("*").eq("case_id", case_id),
      supabase.from("liens").select("*, providers(name)").eq("case_id", case_id),
      supabase.from("policy_details").select("*").eq("case_id", case_id).maybeSingle(),
      supabase.from("insurance_colossus_data").select("*").eq("case_id", case_id).maybeSingle(),
      supabase.from("patient_profiles").select("*").eq("case_id", case_id).maybeSingle(),
    ]);

    const caseData = caseRes.data;
    const specials = (chargesRes.data || []).reduce((s: number, c: any) => s + (c.charge_amount || 0), 0);
    const painSufferingAmount = specials * (multiplier || 3);
    const totalDemand = specials + painSufferingAmount + (additional_damages || 0);

    const prompt = `You are an expert personal injury demand letter writer with 20 years of experience maximizing settlements.

Write a comprehensive, persuasive demand letter for the following PI case.

CASE DATA: ${JSON.stringify({ case: caseData, patient: patientRes.data })}

CHARGES (Medical Specials): ${JSON.stringify(chargesRes.data)}
Total Medical Specials: $${specials.toLocaleString()}

APPOINTMENTS: ${JSON.stringify(apptsRes.data)}

MEDICAL RECORDS: ${JSON.stringify(recordsRes.data)}

LIENS: ${JSON.stringify(liensRes.data)}

POLICY DETAILS: ${JSON.stringify(policyRes.data)}

COLOSSUS FACTORS: ${JSON.stringify(colossusRes.data)}

DEMAND PARAMETERS: specials=$${specials.toLocaleString()}, pain_suffering=$${painSufferingAmount.toLocaleString()}, total_demand=$${totalDemand.toLocaleString()}, tone=${tone || 'Professional'}

The letter must include:
- Header: Date, Insurance carrier and adjuster details, Re: Claim number, Claimant name
- Introduction: Brief accident description, liability statement, representation
- Liability Section: Facts of the accident, why the insured is at fault
- Injuries and Treatment: Detailed treatment narrative referencing all providers, specialties, and dates
- Medical Records Summary: List all treating providers, dates, diagnoses, and total visits
- Medical Specials: Itemized table of all medical bills by provider
- Pain and Suffering: Narrative describing impact on daily life, duration, severity
- Lost Wages (if applicable): Documentation and calculation
- Future Medical Needs (if applicable): Prognosis and future treatment projection
- Demand: Specific dollar demand with breakdown
- Time-Limited Demand: 30-day response deadline with policy limits language

Write in ${tone || 'Professional'} tone. Be specific, cite actual dates, provider names, and dollar amounts.
Format with clear headers. This letter will be sent to an insurance adjuster.
Return the complete letter as formatted text only.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI generation failed");
    }

    const aiData = await aiRes.json();
    const letterContent = aiData.choices?.[0]?.message?.content || "";

    // Calculate colossus score
    const cf = colossusRes.data || {};
    let score = 30;
    const sev = cf.injury_severity || "Minor";
    if (sev === "Moderate") score += 10;
    else if (sev === "Serious") score += 20;
    else if (sev === "Severe") score += 30;
    else if (sev === "Catastrophic") score += 40;
    if (cf.imaging_performed) score += 8;
    if (cf.surgery_performed) score += 15;
    if (cf.permanent_impairment) { score += 12; score += Math.floor((cf.impairment_rating_percent || 0) / 4); }
    if (cf.lost_wages_claimed) score += 8;
    if (cf.pre_existing_conditions) score -= 5;
    if (cf.liability_strength === "Clear") score += 10;
    else if (cf.liability_strength === "Weak") score -= 10;
    score += Math.min(Math.floor((cf.treatment_duration_days || 0) / 30), 15);
    score = Math.max(0, Math.min(100, score));

    // Get current version count
    const { count } = await supabase.from("demand_letters").select("id", { count: "exact", head: true }).eq("case_id", case_id);
    const version = (count || 0) + 1;

    // Insert demand letter
    const { data: letter, error: insertErr } = await supabase.from("demand_letters").insert({
      case_id,
      version,
      content: letterContent,
      medical_specials: specials,
      pain_suffering_demand: painSufferingAmount,
      total_demand: totalDemand,
      generated_by: claims.data?.claims?.sub,
      colossus_score: score,
      colossus_factors: cf,
    }).select().single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ letter, score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
