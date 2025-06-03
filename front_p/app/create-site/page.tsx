'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateSiteRootPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Get user state from localStorage or API call
    const getUserState = () => {
      try {
        // Check if running in browser
        if (typeof window !== 'undefined') {
          const userProgress = localStorage.getItem('userSignupProgress');
          if (userProgress) {
            return JSON.parse(userProgress);
          }
        }
        return null;
      } catch (error) {
        console.error('Error getting user state:', error);
        return null;
      }
    };
    
    const userState = getUserState();
    
    // Redirect based on user's progress
    if (!userState || !userState.step) {
      // New user, start from beginning
      router.push('/create-site/signup');
    } else if (userState.step === 'signup_completed' && !userState.emailVerified) {
      // User completed signup but hasn't verified email
      router.push('/create-site/verify-email');
    } else if (userState.step === 'email_verified' || userState.emailVerified) {
      // Email verified, move to property step
      router.push('/create-site/add-property');
    } else if (userState.step === 'property_added') {
      // Property added, move to plan selection
      router.push('/create-site/select-plan');
    } else {
      // Default fallback
      router.push('/create-site/signup');
    }
  }, [router]);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}