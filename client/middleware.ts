import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth/options'
import { normalizeUserRole } from '@/types/user'

const AUTH_ROUTES = new Set<string>(['login', 'register'])

const ROUTE_ROLES: Record<string, ReadonlySet<string>> = {
  admin: new Set(['ADMIN']),
  'business-owner': new Set(['ADMIN', 'OWNER', 'STAFF']),
  user: new Set(['USER']),
}

function firstSegment(pathname: string) {
  const seg = pathname.split('/')[1] || ''
  return seg.toLowerCase()
}

function safeCallback(nextUrl: NextRequest['nextUrl']) {
  // relative-only to avoid open redirects; keep query
  const rel = `${nextUrl.pathname}${nextUrl.search || ''}`
  return rel.startsWith('/') ? rel : '/'
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', safeCallback(req.nextUrl))
  return NextResponse.redirect(loginUrl)
}

function roleAllowed(role: string | undefined, segment: string) {
  const allowed = ROUTE_ROLES[segment]
  if (!allowed) return true // no role requirement
  return role ? allowed.has(normalizeUserRole(role)) : false
}

function homeForRole(role?: string) {
  const normalized = normalizeUserRole(role)
  if (ROUTE_ROLES.admin.has(normalized)) return '/admin/overview'
  if (ROUTE_ROLES['business-owner'].has(normalized)) return '/business-owner/dashboard'
  if (ROUTE_ROLES.user.has(normalized)) return '/access-denied'
  return '/access-denied'
}

export default auth((req) => {
  const isAuthed = Boolean(req.auth)
  const { pathname } = req.nextUrl
  const seg = firstSegment(pathname)
  const userRole = req.auth?.user?.role

  // Block direct access to auth pages for signed-in users
  if (isAuthed && AUTH_ROUTES.has(seg)) {
    return NextResponse.redirect(new URL(homeForRole(userRole), req.url))
  }

  // Protected segments
  if (seg in ROUTE_ROLES) {
    if (!isAuthed) return redirectToLogin(req)
    if (!roleAllowed(userRole, seg)) {
      return NextResponse.redirect(new URL(homeForRole(userRole), req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  // Run only where needed. Static and api excluded by default here.
  matcher: ['/login', '/register', '/admin/:path*', '/business-owner/:path*', '/user/:path*'],
}
