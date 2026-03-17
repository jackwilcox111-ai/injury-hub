import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const {
      full_name, date_of_birth, phone, email, password, accident_date, accident_state,
      accident_description, insurance_status, has_treatment, care_types,
      has_attorney, attorney_info, sms_consent, signature_name, referral_source,
    } = body;

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // 1. Create auth user with patient role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'patient' },
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 2. Insert case
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

    // 3. Insert patient_profile linked to the new user
    const { error: patientError } = await supabase
      .from('patient_profiles')
      .insert({
        case_id: caseData.id,
        profile_id: userId,
        date_of_birth,
        insurance_status: insurance_status || 'None',
        accident_description,
        hipaa_auth_signed: true,
        hipaa_auth_date: new Date().toISOString(),
        assignment_of_benefits_signed: true,
        aob_date: new Date().toISOString(),
      });

    if (patientError) throw patientError;

    // 4. Auto-create insurance eligibility row
    const billingPath = (insurance_status === 'PIP' || insurance_status === 'MedPay')
      ? 'PIP/MedPay' : 'Lien Only';
    await supabase.from('insurance_eligibility').insert({
      case_id: caseData.id,
      insurance_type: insurance_status || 'None',
      billing_path: billingPath,
      verified: false,
    });

    // 5. Capture referral source if provided
    if (referral_source) {
      await supabase.from('referral_sources').insert({
        entity_id: caseData.id,
        entity_type: 'case',
        source_type: referral_source,
      });
    }

    // 6. Notify all admins
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
