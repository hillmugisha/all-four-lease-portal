import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('allfour_auth')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    // Token is expired or signature is invalid — clear it and redirect
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('allfour_auth', '', { maxAge: 0, path: '/' })
    return response
  }
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:webp|png|jpg|jpeg|svg|ico|gif|woff2?|ttf|otf|css|js)).*)'],
}
