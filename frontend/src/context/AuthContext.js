"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const part = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.split('=')[1]) : null;
};

// Helper function to set cookies
const setCookie = (name, value, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;samesite=lax`;
};

// Helper function to delete cookies
const deleteCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const router = useRouter();

  const applyBridgedSession = () => {
    const storedToken = localStorage.getItem('authToken') || getCookie('authToken');
    const storedRole = localStorage.getItem('userRole') || localStorage.getItem('userType') || getCookie('userRole');
    const storedUid = localStorage.getItem('userId') || getCookie('userId') || process.env.NEXT_PUBLIC_HOST_ID;
    const storedEmail = localStorage.getItem('userEmail') || getCookie('userEmail') || null;

    if (!storedToken || !storedRole) {
      return false;
    }

    const bridgedUser = {
      uid: storedUid || 'bridged-host',
      email: storedEmail,
      role: storedRole,
      isBridgedSession: true,
    };

    setUser(bridgedUser);
    setUserRole(storedRole);
    setAuthToken(storedToken);

    localStorage.setItem('authToken', storedToken);
    localStorage.setItem('token', storedToken);
    if (storedRole) {
      localStorage.setItem('userRole', storedRole);
      localStorage.setItem('userType', storedRole);
    }
    if (storedUid) {
      localStorage.setItem('userId', storedUid);
    }
    if (storedEmail) {
      localStorage.setItem('userEmail', storedEmail);
    }
    localStorage.setItem('user', JSON.stringify(bridgedUser));

    return true;
  };

  useEffect(() => {
    const bootstrapped = applyBridgedSession();
    if (bootstrapped) {
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get fresh token and custom claims
          const token = await firebaseUser.getIdToken(true);
          const tokenResult = await firebaseUser.getIdTokenResult();
          
          // Get role from custom claims (set by your backend)
          const role = tokenResult.claims.role;
          
          setUser(firebaseUser);
          setUserRole(role);
          setAuthToken(token);
          
          // Update localStorage
          localStorage.setItem('authToken', token);
          localStorage.setItem('userType', role);
          localStorage.setItem('userEmail', firebaseUser.email);
          localStorage.setItem('userRole', role);
          localStorage.setItem('token', token); // Keep compatibility with existing code
          localStorage.setItem('user', JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: role
          }));
          
          // Set cookies (same data for middleware access)
          setCookie('authToken', token);
          setCookie('userRole', role);
          setCookie('userEmail', firebaseUser.email);
          
          console.log('User authenticated:', {
            email: firebaseUser.email,
            role: role,
            uid: firebaseUser.uid
          });
        } else {
          const reused = applyBridgedSession();
          if (reused) {
            return;
          }

          // User is signed out
          setUser(null);
          setUserRole(null);
          setAuthToken(null);
          
          // Clear localStorage
          localStorage.removeItem('authToken');
          localStorage.removeItem('userType');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userProfile');
          localStorage.removeItem('userRole');
          localStorage.removeItem('token'); // Keep compatibility
          localStorage.removeItem('user'); // Keep compatibility
          
          // Clear cookies
          deleteCookie('authToken');
          deleteCookie('userRole');
          deleteCookie('userEmail');
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        // Reset state on error
        setUser(null);
        setUserRole(null);
        setAuthToken(null);
        
        // Clear storage on error
        localStorage.clear();
        deleteCookie('authToken');
        deleteCookie('userRole');
        deleteCookie('userEmail');
      } finally {
        setLoading(false);
      }
    });

    // Listen for custom logout events
    const handleLogout = () => {
      setUser(null);
      setUserRole(null);
      setAuthToken(null);
      
      // Clear cookies on logout
      deleteCookie('authToken');
      deleteCookie('userRole');
      deleteCookie('userEmail');
    };

    window.addEventListener('userLoggedOut', handleLogout);

    return () => {
      unsubscribe();
      window.removeEventListener('userLoggedOut', handleLogout);
    };
  }, []);

  const value = {
    user,
    userRole,
    loading,
    authToken,
    isAuthenticated: !!user,
    isHost: userRole === 'host',
    isUser: userRole === 'user',
    // Keep compatibility with existing code
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Keep compatibility with existing code
export { AuthContext };