import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-side only — uses service_role key which bypasses RLS.
// Never import this in client components or NEXT_PUBLIC_ code paths.
let _adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    if (!url || !key) throw new Error('SUPABASE_SECRET_KEY is not set')
    _adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    })
  }
  return _adminClient
}
