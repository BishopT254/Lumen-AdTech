import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected route patterns
const ADVERTISER_PROTECTED_ROUTES = ['/advertiser'];
const PARTNER_PROTECTED_ROUTES = ['/partner'];
const ADMIN_PROTECTED_ROUTES = ['/admin'];

// Routes that should redirect to dashboard if logged in
const AUTH_ROUTES = ['/auth/signin', '/auth/register', '/auth/forgot-password'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Get token and check if user is authenticated
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // User is not logged in but trying to access protected route
  if (!token) {
    if (
      ADVERTISER_PROTECTED_ROUTES.some(route => pathname.startsWith(route)) ||
      PARTNER_PROTECTED_ROUTES.some(route => pathname.startsWith(route)) ||
      ADMIN_PROTECTED_ROUTES.some(route => pathname.startsWith(route))
    ) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
    
    // Allow access to public routes
    return NextResponse.next();
  }
  
  // User is logged in
  const userRole = token.role as string;
  
  // If user is trying to access auth routes while logged in
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    let redirectPath = '/';
    
    // Redirect to the appropriate dashboard based on role
    if (userRole === 'ADVERTISER') {
      redirectPath = '/advertiser';
    } else if (userRole === 'PARTNER') {
      redirectPath = '/partner';
    } else if (userRole === 'ADMIN') {
      redirectPath = '/admin';
    }
    
    return NextResponse.redirect(new URL(redirectPath, req.url));
  }
  
  // Role-based access checks
  if (
    ADVERTISER_PROTECTED_ROUTES.some(route => pathname.startsWith(route)) &&
    userRole !== 'ADVERTISER' &&
    userRole !== 'ADMIN'
  ) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
  
  if (
    PARTNER_PROTECTED_ROUTES.some(route => pathname.startsWith(route)) &&
    userRole !== 'PARTNER' &&
    userRole !== 'ADMIN'
  ) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
  
  if (
    ADMIN_PROTECTED_ROUTES.some(route => pathname.startsWith(route)) &&
    userRole !== 'ADMIN'
  ) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
  
  // Allow access for valid requests
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    // Run on all authenticated routes
    '/advertiser/:path*',
    '/partner/:path*',
    '/admin/:path*',
    
    // Run on auth routes
    '/auth/:path*',
  ],
}; 