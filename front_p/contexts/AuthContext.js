// contexts/AuthContext.js
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

// Helper function to set cookies
const setCookie = (name, value, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
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

  useEffect(() => {
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
    isAdmin: userRole === 'admin',
    isHost: userRole === 'host',
    isUser: userRole === 'user'
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