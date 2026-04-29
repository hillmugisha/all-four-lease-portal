import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
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

  const denied = NextResponse.json(
    { error: 'Access denied. Reach out to hill.mugisha@pritchards.com to get access.' },
    { status: 403 },
  )

  if (error || !data) return denied
  if (!data.access_granted) return denied

  // Update login_count and last_login (fire-and-forget — don't block the response)
  supabase
    .from('users')
    .update({ login_count: (data.login_count ?? 0) + 1, last_login: new Date().toISOString() })
    .eq('email', normalised)
    .then(() => {})

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)
  const token = await new SignJWT({ email: data.email, name: data.name ?? '' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  const res = NextResponse.json({ ok: true, name: data.name ?? '' })

  res.cookies.set('allfour_auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  })

  return res
}
