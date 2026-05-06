import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_MENSAGERIA_API_PREFIXES = [
  '/api/mensageria/webhook',
  '/api/mensageria/oauth/callback',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAdminSession = Boolean(request.cookies.get('adminAuthToken')?.value)

  if (pathname.startsWith('/api/mensageria')) {
    if (PUBLIC_MENSAGERIA_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.next()
    }

    if (!hasAdminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (pathname.startsWith('/mensageria') && !hasAdminSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/mensageria/:path*', '/api/mensageria/:path*'],
}
