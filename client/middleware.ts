import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Super admin email - hardcoded for now, but could be loaded from env in a production setting
const SUPER_ADMIN_EMAIL = 'karthickrajans.21cse@kongu.edu';

// Configure which paths should be protected
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/api/enrollments',
  '/api/attendance',
  '/api/user',
]

// Public API paths that don't require authentication
const publicApiPaths = [
  '/api/courses',
]

// Configure paths that should only be accessible by instructors
const instructorPaths = [
  '/instructor',
  '/api/courses/create',
  '/api/attendance/report',
]

// Configure paths that should only be accessible by admins
const adminPaths = [
  '/dashboard/settings/make-instructor',
  '/dashboard/admin',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if this is a public API path (like GET /api/courses)
  if (isPublicApiPath(pathname) && request.method === 'GET') {
    return NextResponse.next()
  }
  
  // Skip middleware for non-protected paths
  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  // Get the session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Redirect to login if no token found (user not authenticated)
  if (!token) {
    const url = new URL('/', request.url)
    url.searchParams.set('callbackUrl', encodeURI(pathname))
    return NextResponse.redirect(url)
  }

  // Check if this is the super admin - super admin has access to everything
  const isSuperAdmin = token.email === SUPER_ADMIN_EMAIL;
  if (isSuperAdmin) {
    return NextResponse.next();
  }

  // Check instructor permissions
  if (isInstructorPath(pathname) && token.role !== 'instructor') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check admin permissions
  if (isAdminPath(pathname) && token.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // User is authenticated and authorized, proceed
  return NextResponse.next()
}

// Helper function to check if the path should be protected
function isProtectedPath(path: string): boolean {
  return protectedPaths.some(protectedPath => path.startsWith(protectedPath))
}

// Helper function to check if the path is a public API path
function isPublicApiPath(path: string): boolean {
  return publicApiPaths.some(publicPath => path.startsWith(publicPath))
}

// Helper function to check if the path is instructor-only
function isInstructorPath(path: string): boolean {
  return instructorPaths.some(instructorPath => path.startsWith(instructorPath))
}

// Helper function to check if the path is admin-only
function isAdminPath(path: string): boolean {
  return adminPaths.some(adminPath => path.startsWith(adminPath))
}

// Configure paths that will be processed by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files like images, fonts, etc)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
} 