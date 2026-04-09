import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — created only when first used (not at build time)
let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!_client) {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) throw new Error('Supabase env vars not set')
    _client = createClient(url, anon)
  }
  return _client
}

export function getSupabase() {
  return getClient()
}
