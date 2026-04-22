import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function logAudit(
  userEmail: string,
  action: string,
  resourceId?: string,
  details?: Record<string, unknown>,
) {
  try {
    await getSupabaseAdmin().from('audit_logs').insert({
      user_email:  userEmail,
      action,
      resource_id: resourceId ?? null,
      details:     details ?? null,
    })
  } catch {
    // never throw — audit failure must not break the main action
  }
}
