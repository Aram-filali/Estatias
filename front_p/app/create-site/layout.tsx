'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './HostSignupStep1.module.css';
import _ProtectedRoute from 'components/ProtectedRoute';

const ProtectedRoute = _ProtectedRoute as React.FC<{
  allowedRoles?: string[];
  redirectTo?: string;
  children: ReactNode;
}>;

// Define props that will be passed to children
interface LayoutProps {
  children: ReactNode;
}

export default function GetStartedLayout({ children }: LayoutProps) {
  const pathname = usePathname();
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Determine which step is active based on the current path
  useEffect(() => {
    // New array to track completed steps
    const completed: number[] = [];
    
    if (pathname?.includes('/signup')) {
      setActiveStep(1);
    } else if (pathname?.includes('/verify-email')) {
      setActiveStep(1);
      // Step 1 is not completed yet during verification
    } else if (pathname?.includes('/email-verified')) {
      setActiveStep(2); // Move to next step
      completed.push(1); // Mark step 1 as completed
    } else if (pathname?.includes('/add-property')) {
      setActiveStep(2);
      completed.push(1); // Step 1 is completed
    } else if (pathname?.includes('/select-plan')) {
      setActiveStep(3);
      completed.push(1, 2); // Steps 1 and 2 are completed
    }
    
    setCompletedSteps(completed);
  }, [pathname]);

  // Map step labels
  const stepLabels = ['Account Setup', 'Property Details', 'Select Plan'];

  return (
    <div className={styles.container}>
      {/* Background */}
      <div className="fixed top-0 left-0 w-full h-full">
        <div className="w-full h-full bg-[url('/bg-city.jpg')] bg-cover bg-center filter blur-sm"></div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.stepper}>
          <div className={styles.steps}>
            {[1, 2, 3].map((step) => (
              <div key={step} className={styles.stepContainer}>
                <div className={`${styles.step} ${activeStep >= step ? styles.activeStep : ''} ${completedSteps.includes(step) ? styles.completedStep : ''}`}>
                  {completedSteps.includes(step) ? '✓' : step}
                </div>
                {step !== 3 && (
                  <div className={`${styles.line} ${activeStep > step || completedSteps.includes(step) ? styles.activeLine : ''}`}></div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.stepLabels}>
            {stepLabels.map((label, index) => (
              <div
                key={label}
                className={`${styles.stepLabel} ${activeStep >= index + 1 ? styles.activeLabel : ''}`}
              >
                {label}
                {index === 0 && pathname?.includes('/verify-email') && (
                  <span className={styles.subStep}> (Verification)</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.stepContent}>
          {children}
        </div>
      </div>
    </div>
  );
}