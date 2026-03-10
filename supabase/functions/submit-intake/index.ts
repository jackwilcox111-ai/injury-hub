import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const {
      full_name, date_of_birth, phone, email, accident_date, accident_state,
      accident_description, insurance_status, has_treatment, care_types,
      has_attorney, attorney_info, sms_consent, signature_name,
    } = body;

    // Insert case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .insert({
        patient_name: full_name,
        patient_phone: phone,
        patient_email: email,
        accident_date,
        accident_state,
        status: 'Intake',
        sol_period_days: 730,
        specialty: care_types?.[0] || null,
        notes: accident_description || null,
      })
      .select('id, case_number')
      .single();

    if (caseError) throw caseError;

    // Insert patient_profiles (no profile_id yet — linked later by admin)
    const { error: patientError } = await supabase
      .from('patient_profiles')
      .insert({
        case_id: caseData.id,
        date_of_birth,
        insurance_status: insurance_status || 'None',
        accident_description,
        hipaa_auth_signed: true,
        hipaa_auth_date: new Date().toISOString(),
        assignment_of_benefits_signed: true,
        aob_date: new Date().toISOString(),
      });

    if (patientError) throw patientError;

    // Notify all admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((a: { id: string }) => ({
          recipient_id: a.id,
          title: 'New Patient Intake',
          message: `New intake: ${full_name} — ${accident_state}`,
          link: `/cases/${caseData.id}`,
        }))
      );
    }

    return new Response(
      JSON.stringify({ success: true, case_number: caseData.case_number, case_id: caseData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
