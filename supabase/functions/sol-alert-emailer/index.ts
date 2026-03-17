import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Fetch all active cases with SoL dates
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('id, case_number, patient_name, sol_date, accident_state, attorney_id, attorneys(email, firm_name, contact_name)')
      .not('sol_date', 'is', null)
      .neq('status', 'Settled');

    if (casesError) throw casesError;

    const TIERS = [365, 180, 90, 30];
    const now = new Date();
    const alertsSent: string[] = [];

    for (const c of (cases || [])) {
      const solDate = new Date(c.sol_date!);
      const daysRemaining = Math.ceil((solDate.getTime() - now.getTime()) / 86400000);

      for (const tier of TIERS) {
        // Check if days remaining is within range for this tier
        if (daysRemaining <= tier && daysRemaining > tier - 1) {
          // Check if alert already sent for this tier
          const { data: existing } = await supabase
            .from('sol_alerts')
            .select('id')
            .eq('case_id', c.id)
            .eq('alert_tier', tier)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const attorneyEmail = (c as any).attorneys?.email;
          const attorneyName = (c as any).attorneys?.contact_name || (c as any).attorneys?.firm_name || 'Attorney';

          // Insert alert record
          await supabase.from('sol_alerts').insert({
            case_id: c.id,
            alert_tier: tier,
            recipient_email: attorneyEmail || null,
          });

          // Notify all admins
          const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
          if (admins && admins.length > 0) {
            await supabase.from('notifications').insert(
              admins.map((a: { id: string }) => ({
                recipient_id: a.id,
                title: `SoL Alert: ${tier} Days — ${c.case_number}`,
                message: `${c.patient_name} — ${c.accident_state}: ${daysRemaining} days remaining on statute of limitations.`,
                link: `/cases/${c.id}`,
              }))
            );
          }

          alertsSent.push(`${c.case_number}: ${tier}-day alert`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, alerts_sent: alertsSent.length, details: alertsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('sol-alert-emailer error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
