'use client';

import { Step1 } from './step1';
import { useRouter } from 'next/navigation';
import { useState} from 'react';

export default function SignupPage() {
  const router = useRouter();
  
  const [userData, setUserData] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('userSignupData');
      return savedData ? JSON.parse(savedData) : {};
    }
    return {};
  });

  const saveUserData = (data: any) => {
    const updatedData = { ...userData, ...data };
    setUserData(updatedData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSignupData', JSON.stringify(updatedData));
    }
  };

  const nextStep = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSignupProgress', JSON.stringify({
        step: 'signup_completed',
        emailVerified: false,
        timestamp: new Date().toISOString()
      }));
    }
    router.push('/create-site/verify-email');
  };

  return (
    <Step1 
      nextStep={nextStep}
      //saveUserData={saveUserData}
      //userData={userData}
      // Add other props as needed
      currentStep={1}
      totalSteps={3}
    />
  );
}