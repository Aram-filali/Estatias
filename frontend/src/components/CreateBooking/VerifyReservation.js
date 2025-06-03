import React, { useState } from 'react';
import styles from './BookingSteps.module.css';

const VerifyReservation = ({
  personalInfo,
  hostMessage,
  setHostMessage,
  setIsHostMessageWritten,
  termsAccepted,
  setTermsAccepted,
  onPreviousStep,
  onSubmitBooking,
  isSubmitting
}) => {
  // State to track if editing message
  const [isEditingMessage, setIsEditingMessage] = useState(false);

  // Handle message to host changes
  const handleMessageChange = (e) => {
    const message = e.target.value;
    setHostMessage(message);
    setIsHostMessageWritten(true); // We consider this step complete even with empty message
  };

  // Handle terms checkbox changes
  const handleTermsChange = (e) => {
    setTermsAccepted(e.target.checked);
  };
  
  // Go back to edit personal info
  const handleEditPersonalInfo = (e) => {
    e.stopPropagation();
    console.log('Edit clicked'); // For debugging
    if (onPreviousStep) {
      onPreviousStep();
    } else {
      console.warn('onPreviousStep prop not provided');
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (termsAccepted && onSubmitBooking) {
      onSubmitBooking();
    }
  };

  return (
    <div className={styles.verifyReservationContainer}>
      {/* Display personal information */}
      <div className={styles.personalInfoSummary}>
        <h3>
          Personal Information
          <button 
            type="button" 
            className={styles.editButton}
            onClick={handleEditPersonalInfo}
            aria-label="Edit personal information"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.5 3.5C16.8978 3.10217 17.4374 2.87868 18 2.87868C18.5626 2.87868 19.1022 3.10217 19.5 3.5C19.8978 3.89782 20.1213 4.43739 20.1213 5C20.1213 5.56261 19.8978 6.10217 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Edit
          </button>
        </h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Name</span>
            <span className={styles.infoValue}>{personalInfo.fullName}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{personalInfo.email}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Phone</span>
            <span className={styles.infoValue}>{personalInfo.phone}</span>
          </div>
        </div>
        
        {personalInfo.message && (
          <div className={styles.messageBox}>
            <div className={styles.messageHeader}>
              Message to Host
            </div>
            <div className={styles.messageContent}>
              {personalInfo.message}
            </div>
          </div>
        )}
      </div>

      <div className={styles.newerinfo}>
      {/* Message to host */}
      {isEditingMessage ? (
        <div className={styles.formGroup}>
          <h3>
            Special Requests <span className={styles.optional}>(optional)</span>
          </h3>
          <textarea
            id="hostMessage"
            value={hostMessage}
            onChange={handleMessageChange}
            rows="4"
            placeholder="Anything else you'd like to tell the host?"
          />
          <div style={{ textAlign: 'right', marginTop: '8px' }}>
            <button 
              type="button" 
              className={styles.changeButton}
              onClick={() => setIsEditingMessage(false)}
            >
              Save Message
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.formGroup}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label>Additional Message to Host</label>
            <button 
              type="button" 
              className={styles.editButton}
              onClick={() => setIsEditingMessage(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.5 3.5C16.8978 3.10217 17.4374 2.87868 18 2.87868C18.5626 2.87868 19.1022 3.10217 19.5 3.5C19.8978 3.89782 20.1213 4.43739 20.1213 5C20.1213 5.56261 19.8978 6.10217 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {hostMessage ? 'Edit' : 'Add'}
            </button>
          </div>
          <div className={styles.messageBox} style={{ marginBottom: 0 }}>
            <div className={styles.messageContent}>
              {hostMessage || "No additional message added yet."}
            </div>
          </div>
        </div>
      )}

      {/* Terms and Conditions */}
      <div className={styles.termsContainer}>
        <div className={styles.checkboxGroup}>
          <div className={styles.checkboxWrapper}>
            <input
              type="checkbox"
              id="termsAccepted"
              checked={termsAccepted}
              onChange={handleTermsChange}
            />
            <span className={styles.customCheckbox}></span>
          </div>
          <label htmlFor="termsAccepted">
            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> <span className={styles.required}>*</span>
          </label>
        </div>
      </div>


      {/* Submit button */}
      <div className={styles.formActions}>
        <button 
          onClick={handleSubmit}
          className={`${styles.submitButton} ${!termsAccepted ? styles.disabledButton : ''}`}
          disabled={!termsAccepted || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className={styles.loadingSpinner}></span>
              Processing...
            </>
          ) : (
            'Complete Booking'
          )}
        </button>
      </div>
      </div>
    </div>
  );
};

export default VerifyReservation;