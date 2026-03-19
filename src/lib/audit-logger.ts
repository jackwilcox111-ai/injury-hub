import { supabase } from '@/integrations/supabase/client';

type AuditAction = 'view' | 'create' | 'update' | 'delete' | 'export' | 'download';
type ResourceType = 'case' | 'patient_profile' | 'document' | 'medical_record' | 'demand_letter' | 'appointment' | 'charge' | 'lien' | 'funding_request' | 'message';

interface AuditEntry {
  action: AuditAction;
  resource_type: ResourceType;
  resource_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logPHIAccess(entry: AuditEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase.from('audit_logs') as any).insert({
      user_id: user.id,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id || null,
      metadata: entry.metadata || {},
    });
  } catch {
    // Silently fail — audit logging should never break the app
  }
}
