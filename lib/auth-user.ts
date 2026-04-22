export function getUserEmailFromRequest(req: Request): string {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const raw = cookieHeader.split('; ').find((c) => c.startsWith('allfour_user='))
  if (!raw) return 'unknown'
  try {
    const val = JSON.parse(decodeURIComponent(raw.split('=').slice(1).join('=')))
    return val.email ?? 'unknown'
  } catch {
    return 'unknown'
  }
}
