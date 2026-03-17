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

    // Find cases with no check-in in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    
    // Get all active cases
    const { data: cases } = await supabase
      .from('cases')
      .select('id, case_number, patient_name')
      .neq('status', 'Settled');

    if (!cases || cases.length === 0) {
      return new Response(JSON.stringify({ success: true, reminders_sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const remindersSent: string[] = [];

    for (const c of cases) {
      // Check if there's a recent check-in
      const { data: recentCheckin } = await supabase
        .from('patient_checkins')
        .select('id')
        .eq('case_id', c.id)
        .gte('created_at', sevenDaysAgo)
        .limit(1);

      if (recentCheckin && recentCheckin.length > 0) continue;

      // Notify all admins and care managers
      const { data: staff } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'care_manager']);

      if (staff && staff.length > 0) {
        await supabase.from('notifications').insert(
          staff.map((s: { id: string }) => ({
            recipient_id: s.id,
            title: `Overdue Check-in: ${c.patient_name}`,
            message: `No patient check-in for ${c.case_number} in 7+ days.`,
            link: `/cases/${c.id}`,
          }))
        );
        remindersSent.push(c.case_number!);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: remindersSent.length, cases: remindersSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('patient-engagement-reminders error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
