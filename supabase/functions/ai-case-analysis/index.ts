import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { case_id, summary_type, case_data } = body;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    let systemPrompt = '';
    let userPrompt = '';

    if (summary_type === 'medical_chronology') {
      systemPrompt = `You are a medical-legal chronology assistant. Given case data, generate a structured medical chronology as JSON. Return ONLY valid JSON with this structure:
{
  "entries": [{"date": "YYYY-MM-DD", "description": "Event description"}],
  "summary": "Brief narrative summary of the treatment timeline"
}`;
      userPrompt = `Generate a medical chronology for this personal injury case:
Patient: ${case_data.patient_name}
Specialty: ${case_data.specialty || 'General'}
Accident Date: ${case_data.accident_date || 'Unknown'}
State: ${case_data.accident_state || 'Unknown'}
Case Status: ${case_data.status}
Records on file: ${case_data.records_count} (types: ${case_data.records_types?.join(', ') || 'none'})
Appointments: ${case_data.appointments_completed}/${case_data.appointments_total} completed
Total lien: $${case_data.liens_total?.toLocaleString() || '0'}

Create a realistic medical chronology based on the available data.`;
    } else if (summary_type === 'demand_readiness') {
      systemPrompt = `You are a demand-readiness analyst for personal injury cases. Evaluate case completeness and return ONLY valid JSON:
{
  "score": <0-100>,
  "checklist": [{"item": "Description", "met": true/false}],
  "recommendation": "Overall recommendation"
}`;
      userPrompt = `Evaluate demand readiness for this case:
Patient: ${case_data.patient_name}
Specialty: ${case_data.specialty || 'General'}
Accident Date: ${case_data.accident_date || 'Unknown'}
State: ${case_data.accident_state || 'Unknown'}
Status: ${case_data.status}
SoL Date: ${case_data.sol_date || 'Unknown'}
Records: ${case_data.records_count} on file (types: ${case_data.records_types?.join(', ') || 'none'})
Appointments: ${case_data.appointments_completed}/${case_data.appointments_total} completed
Lien amount: $${case_data.liens_total?.toLocaleString() || '0'}
Settlement estimate: $${case_data.settlement_estimate?.toLocaleString() || 'Not set'}

Evaluate against these criteria: treatment complete, all records obtained, records delivered to attorney, lien amounts confirmed, settlement estimate set, SoL not at risk.`;
    } else {
      throw new Error('Invalid summary type');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in Settings.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errText);
      throw new Error('AI generation failed');
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '{}';
    // Extract JSON from potential markdown code blocks
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
    let content;
    try {
      content = JSON.parse(jsonMatch[1].trim());
    } catch {
      content = { summary: rawContent };
    }

    const readinessScore = summary_type === 'demand_readiness' ? (content.score || 0) : null;

    // Use service role to upsert the summary
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Delete existing summary of same type for this case
    await adminSupabase.from('ai_summaries').delete().eq('case_id', case_id).eq('summary_type', summary_type);

    const { error: insertError } = await adminSupabase.from('ai_summaries').insert({
      case_id,
      summary_type,
      content,
      readiness_score: readinessScore,
      generated_by: userId,
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, content, readiness_score: readinessScore }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ai-case-analysis error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
