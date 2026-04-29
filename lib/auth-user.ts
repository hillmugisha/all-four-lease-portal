import { jwtVerify } from 'jose'

export async function getUserEmailFromRequest(req: Request): Promise<string> {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const raw = cookieHeader.split('; ').find((c) => c.startsWith('allfour_auth='))
  if (!raw) return 'unknown'

  const token = raw.split('=').slice(1).join('=')
  try {
    const rawSecret = process.env.AUTH_SECRET
    if (!rawSecret) return 'unknown'
    const secret = new TextEncoder().encode(rawSecret)
    const { payload } = await jwtVerify(token, secret)
    return (payload.email as string) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}
