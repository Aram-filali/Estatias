// components/ProtectedRoute.js
"use client";
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ProtectedRoute = ({ children, allowedRoles = [], redirectTo = '/login' }) => {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [isAuthorizing, setIsAuthorizing] = useState(true);

  useEffect(() => {
    if (!loading) {
      // Add a small delay to ensure auth state is fully settled
      const timer = setTimeout(() => {
        if (!user) {
          console.log('ProtectedRoute: No user, redirecting to:', redirectTo);
          router.push(redirectTo);
          return;
        }

        if (allowedRoles.length > 0) {
          // Check localStorage as fallback for role
          const storedRole = userRole || localStorage.getItem('userRole') || localStorage.getItem('userType');
          
          if (!storedRole || !allowedRoles.includes(storedRole)) {
            console.log('ProtectedRoute: Role not authorized:', { storedRole, allowedRoles });
            router.push('/unauthorized');
            return;
          }
        }
        
        setIsAuthorizing(false);
      }, 100); // Small delay to ensure auth state is settled

      return () => clearTimeout(timer);
    }
  }, [user, userRole, loading, router, allowedRoles, redirectTo]);

  // Show loading while Firebase auth is initializing
  if (loading || isAuthorizing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check authorization
  if (!user) {
    return null; // Will redirect via useEffect
  }

  if (allowedRoles.length > 0) {
    const storedRole = userRole || localStorage.getItem('userRole') || localStorage.getItem('userType');
    
    if (!storedRole || !allowedRoles.includes(storedRole)) {
      return null; // Will redirect via useEffect
    }
  }

  return children;
};

export default ProtectedRoute;