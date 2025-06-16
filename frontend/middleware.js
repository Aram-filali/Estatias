// middleware.js (in your project root)
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Define protected routes and their required roles
  const protectedRoutes = {
    '/editProfile': ['user'],
    '/MyBooking': ['user'],
    // All routes starting with /MyWebsite are for hosts
  };

   // Define routes that should be blocked for specific roles
  const blockedRoutes = {
    // Payment routes - block hosts, allow users and guests
    '/payments': { 
      blockedRoles: ['host'],
      allowedRoles: ['user'], // 'user' role or no role (guests)
      allowGuests: true
    }
  };

  // Get user data from cookies
    const authToken = request.cookies.get('authToken')?.value;
    const userRole = request.cookies.get('userRole')?.value;
    
    console.log('Middleware check:', { pathname, authToken: !!authToken, userRole });




    
  // Check for blocked routes (like payments for hosts)
  let blockedConfig = null;
  for (const [route, config] of Object.entries(blockedRoutes)) {
    if (pathname.startsWith(route)) {
      blockedConfig = config;
      break;
    }
  }

  
    // Handle blocked routes (like payments for hosts)
  if (blockedConfig) {
    // If user is authenticated and has a blocked role
    if (authToken && userRole && blockedConfig.blockedRoles.includes(userRole)) {
      console.log('Access blocked for role:', userRole, 'on path:', pathname);
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    // If user is authenticated and has an allowed role, let them through
    if (authToken && userRole && blockedConfig.allowedRoles.includes(userRole)) {
        console.log('Access allowed for role:', userRole, 'on path:', pathname);
      return NextResponse.next();
    }
    
    // If guests are allowed and user is not authenticated, let them through
    if (blockedConfig.allowGuests && !authToken) {
        console.log('Access allowed for guest on path:', pathname);
      return NextResponse.next();
    }
    
   // If user is authenticated but role is not explicitly allowed or blocked
    // For payment routes, this would be any other role besides 'host' and 'user'
    if (authToken && userRole) {
      console.log('Access blocked for undefined role:', userRole, 'on path:', pathname);
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    // If no auth token and guests not allowed
    if (!authToken && !blockedConfig.allowGuests) {
      console.log('Access blocked for unauthenticated user on path:', pathname);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }


  // Check if the current path requires protection
  let requiredRoles = protectedRoutes[pathname];
  
  // Special handling for MyWebsite routes (any path starting with /MyWebsite)
  if (pathname.startsWith('/MyWebsite')) {
    requiredRoles = ['host'];
  }



  if (requiredRoles) { 
    if (!authToken) {
      console.log('No auth token, redirecting to login');
      return NextResponse.redirect(new URL('/Login', request.url));
    }
    
    // Check if user role matches required roles
    if (!userRole || !requiredRoles.includes(userRole)) {
      console.log('Role mismatch:', { userRole, requiredRoles });
      
      // If user has a token but wrong role, redirect to unauthorized
      if (userRole) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
      
      // If no role info, redirect to login
      return NextResponse.redirect(new URL('/Login', request.url));
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
    '/editProfile/:path*',
    '/MyBooking/:path*',
    '/MyWebsite/:path*',
    '/payments/:path*'
  ]
};