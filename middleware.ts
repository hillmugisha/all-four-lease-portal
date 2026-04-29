import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

function getSecret() {
  const s = process.env.AUTH_SECRET
  if (!s) throw new Error('AUTH_SECRET environment variable is not set')
  return new TextEncoder().encode(s)
}

function isApiRoute(request: NextRequest) {
  return request.nextUrl.pathname.startsWith('/api/')
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('allfour_auth')?.value

  if (!token) {
    if (isApiRoute(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, getSecret())
    return NextResponse.next()
  } catch {
    // Token is expired or signature is invalid — clear it and redirect
    if (isApiRoute(request)) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      response.cookies.set('allfour_auth', '', { maxAge: 0, path: '/' })
      return response
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set('allfour_auth', '', { maxAge: 0, path: '/' })
    return response
  }
}

export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:webp|png|jpg|jpeg|svg|ico|gif|woff2?|ttf|otf|css|js)).*)'],
}
