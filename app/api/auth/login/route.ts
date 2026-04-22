import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email?: string }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const normalised = email.trim().toLowerCase()

  if (!normalised.endsWith('@pritchards.com')) {
    return NextResponse.json({ error: 'Must be a @pritchards.com email address.' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .select('email, name, access_granted, login_count')
    .eq('email', normalised)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Access not granted. Contact your administrator.' }, { status: 403 })
  }

  if (!data.access_granted) {
    return NextResponse.json({ error: 'Your access has been revoked. Contact your administrator.' }, { status: 403 })
  }

  // Update login_count and last_login (fire-and-forget — don't block the response)
  supabase
    .from('users')
    .update({ login_count: (data.login_count ?? 0) + 1, last_login: new Date().toISOString() })
    .eq('email', normalised)
    .then(() => {})

  const payload = Buffer.from(JSON.stringify({ email: data.email, name: data.name ?? '', iat: Date.now() })).toString('base64')

  const res = NextResponse.json({ ok: true, name: data.name ?? '' })

  res.cookies.set('allfour_auth', payload, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  })

  res.cookies.set('allfour_user', JSON.stringify({ email: data.email, name: data.name ?? '' }), {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  })

  return res
}
