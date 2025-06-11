// middleware.js (in your project root)
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Define protected routes and their required roles
  const protectedRoutes = {
    '/dashboard': ['host'],
    '/adminn': ['admin'],
    '/admin': ['admin'],
    '/create-site': ['host'],
  };
  
  // Check if the current path requires protection
  const requiredRoles = protectedRoutes[pathname];
  
  if (requiredRoles) {
    // Get user data from cookies
    const authToken = request.cookies.get('authToken')?.value;
    const userRole = request.cookies.get('userRole')?.value;
    
    console.log('Middleware check:', { pathname, authToken: !!authToken, userRole });
    
    if (!authToken) {
      console.log('No auth token, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Check if user role matches required roles
    if (!userRole || !requiredRoles.includes(userRole)) {
      console.log('Role mismatch:', { userRole, requiredRoles });
      
      // If user has a token but wrong role, redirect to unauthorized
      if (userRole) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
      
      // If no role info, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Optional: Verify JWT token with your backend
    // You can add token verification here if needed
    try {
      // Example: verify token with your backend
      // const response = await fetch('http://localhost:3000/verify-token', {
      //   headers: { Authorization: `Bearer ${authToken}` }
      // });
      // if (!response.ok) {
      //   return NextResponse.redirect(new URL('/login', request.url));
      // }
    } catch (error) {
      console.error('Token verification failed:', error);
      // Optionally redirect to login on verification failure
      // return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/adminn/:path*', 
    '/admin/:path*',
    '/create-site/:path*'
  ]
};