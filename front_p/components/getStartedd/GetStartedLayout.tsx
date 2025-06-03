'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./HostSignupStep1.module.css";
import dynamic from "next/dynamic";

// Define types for step components props
interface StepProps {
  nextStep: () => void;
  prevStep?: () => void;
}

interface MailVerifiedProps extends StepProps {
  initialToken?: string | null;
}

interface PricesProps {
  showButton?: boolean;
  onPlanSelect?: (planId: string) => void;
  showContinueButton?: boolean;
}

const Step1 = dynamic(() => import("./Step1"), { ssr: false });
const MailVerified = dynamic(() => import("./step4"), { ssr: false });
const SearchPage2 = dynamic(() => import('../addProperty/AddProperty'), { ssr: false });
const Prices = dynamic(() => import("../prices/prices"), { ssr: false });

export default function HostSignup() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  
  // Handle token from URL on component mount
  useEffect(() => {
    // Check for token in URL and for "verified=true" parameter
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const verified = urlParams.get('verified');
    
    if (token) {
      setVerificationToken(token);
      // If token is present, go to verification step
      setCurrentStep(2);
    } else if (verified === 'true') {
      // If already verified, move to step 3
      setCurrentStep(3);
    }
  }, []);
  
  const nextStep = () => {
    if (currentStep < 4) {
      if (currentStep === 4 && !selectedPlan) {
        return;
      }
      setCurrentStep((prevStep) => prevStep + 1);
      
      // Update URL to reflect verification success when moving from step 2 to 3
      if (currentStep === 2) {
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        url.searchParams.set('verified', 'true');
        window.history.pushState({}, '', url);
      }
    } else {
      router.push("/dashboard");
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className={styles.container}>
            {/* Background */}
            <div className="fixed top-0 left-0 w-full h-full">
        <div className="w-full h-full bg-[url('/bg-city.jpg')] bg-cover bg-center filter blur-sm"></div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.stepper}>
          <div className={styles.steps}>
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={styles.stepContainer}>
                <div
                  className={`${styles.step} ${
                    currentStep > step ? styles.completed : ""
                  } ${
                    currentStep === step ? styles.active : ""
                  }`}
                >
                  {currentStep > step ? "✓" : step}
                </div>
                {step !== 4 && (
                  <div
                    className={`${styles.line} ${
                      currentStep > step ? styles.lineActive : ""
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <h2 className={styles.stepTitle}>
          {currentStep === 1 ? "" : 
           currentStep === 2 ? "Verify Your Email" : 
           currentStep === 3 ? "Add your property" : 
           "Publish & Get Bookings"}
        </h2>
        
        <div className={styles.stepContent}>
          {currentStep === 1 && <Step1 nextStep={nextStep} />}
          
          {currentStep === 2 && (
            <MailVerified 
              nextStep={nextStep} 
              prevStep={prevStep}
              initialToken={verificationToken} 
            />
          )}
          
          {currentStep === 3 && (
            <SearchPage2 
              nextStep={nextStep} 
              prevStep={prevStep}
            />
          )}
          
          {currentStep === 4 && (
            <>
              <Prices
                showContinueButton={true}
                onPlanSelect={(planId: string) => {
                  setSelectedPlan(planId);
                  // You could automatically proceed to next step when plan is selected
                  // or let the user proceed manually with buttons below
                }}
              />
              <div className={styles.navigationButtons}>
                <button onClick={prevStep} className={styles.backButton}>
                  Back
                </button>
                {selectedPlan && (
                  <button onClick={nextStep} className={styles.nextButton}>
                    Continue
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}