import React, { useState } from 'react';
import styles from './BookingSteps.module.css';
import PersonalDetails from './personalDetails';
import VerifyReservation from './VerifyReservation';

const BookingSteps = ({
  activeStep,
  personalInfo,
  hostMessage,
  isPersonalInfoComplete,
  isHostMessageWritten,
  calculatePayments,
  formatPaymentDate,
  onStepToggle= () => {},
  onNextStep,
  setPersonalInfo,
  setIsPersonalInfoComplete,
  setHostMessage,
  setIsHostMessageWritten,
  onSubmitBooking,
  isSubmitting
}) => {
  // Add termsAccepted state to manage the checkbox state
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleStepClick = (stepNumber) => {
    if (stepNumber === 1 && (activeStep === 1 || isPersonalInfoComplete)) {
      onStepToggle(stepNumber);
    }
    if (stepNumber === 2 && (activeStep === 2 || isPersonalInfoComplete)) {
      onStepToggle(stepNumber);
    }
  };
  return (
    <div className={styles.stepsContainer}>
      {/* Step 1: Personal Details */}
      <div 
        className={`${styles.stepContainer} ${activeStep === 1 ? styles.activeStep : activeStep > 1 ? styles.completedStep : styles.inactiveStep}`}
        onClick={() => handleStepClick(1)}
      >
        <div className={styles.stepHeader}>
          <h2>1. Enter your details</h2>
        </div>
        
        {activeStep === 1 && (
          <PersonalDetails 
            personalInfo={personalInfo}
            setPersonalInfo={setPersonalInfo}
            setIsPersonalInfoComplete={setIsPersonalInfoComplete}
            onNextStep={onNextStep}
          />
        )}
      </div>

      {/* Step 2: Verify your reservation */}
      <div 
        className={`${styles.stepContainer} ${activeStep === 2 ? styles.activeStep : activeStep > 2 ? styles.completedStep : styles.inactiveStep}`}
        onClick={() => handleStepClick(2)}
      >
        <div className={styles.stepHeader}>
          <h2>2. Verify your reservation</h2>
        </div>
        
        {activeStep === 2 && (
          <VerifyReservation 
            personalInfo={personalInfo}
            hostMessage={hostMessage}
            setHostMessage={setHostMessage}
            setIsHostMessageWritten={setIsHostMessageWritten}
            termsAccepted={termsAccepted}
            setTermsAccepted={setTermsAccepted}
            onPreviousStep={() => onStepToggle(1)} 
            onSubmitBooking={onSubmitBooking}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
};

export default BookingSteps;