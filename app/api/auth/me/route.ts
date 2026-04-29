import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('allfour_auth')?.value
  if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return NextResponse.json({ email: payload.email as string, name: payload.name as string })
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
}
