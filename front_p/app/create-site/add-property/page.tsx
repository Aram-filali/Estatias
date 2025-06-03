'use client';

import  SearchPage2  from './step2';
import { useRouter } from 'next/navigation';
import { useState} from 'react';

export default function SignupPage() {
  const router = useRouter();
  
  const [userData, setUserData] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('propertyData');
      return savedData ? JSON.parse(savedData) : {};
    }
    return {};
  });

  const saveUserData = (data: any) => {
    const updatedData = { ...userData, ...data };
    setUserData(updatedData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('propertyData', JSON.stringify(updatedData));
    }
  };

  const nextStep = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('propertyProgress', JSON.stringify({
        step: 'add_property_completed',
        emailVerified: false,
        timestamp: new Date().toISOString()
      }));
    }
    router.push('/create-site/select-plan');
  };

  const prevStep = () => {
    router.push('/create-site/signup');
  };

// In SignupPage component, modify the return statement:
return (
  <SearchPage2
    nextStep={nextStep}
    prevStep={prevStep}
    currentStep={2}
    totalSteps={3}
  />
);
}