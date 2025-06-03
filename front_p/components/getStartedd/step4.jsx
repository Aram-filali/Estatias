'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from './HostSignupStep1.module.css'; // Use the same CSS module

export default function MailVerified({ 
  nextStep,
  prevStep,
  initialToken 
}) {
  const [status, setStatus] = useState(initialToken ? 'verifying' : 'ready');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!initialToken) return;

    const verifyToken = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const endpointUrl = `${apiUrl}/hosts/verify-email`;

        const response = await axios.post(endpointUrl, { token: initialToken }, {
          headers: { 'Content-Type': 'application/json' },
          validateStatus: (status) => status >= 200 && status < 500,
        });

        if (response.data.error || response.status >= 400) {
          throw new Error(response.data.message || 'Verification failed');
        }

        setStatus('success');
        setMessage(response.data.message || 'Your email has been successfully verified!');

        try {
          localStorage.setItem('emailVerified', 'true');
          // Automatically proceed to next step after successful verification
          setTimeout(() => {
            nextStep();
          }, 2000);
        } catch (storageError) {
          console.warn('Could not store verification status:', storageError);
        }

      } catch (err) {
        const error = err;
        console.error('Verification error:', error);
        setStatus('error');

        if (error.response?.data) {
          setMessage(
            typeof error.response.data === 'string'
              ? error.response.data
              : error.response.data.message || `Server error: ${error.response.status}`
          );
        } else if (error.request) {
          setMessage('No response from server. Please check your network connection.');
        } else {
          setMessage(error.message || 'An unknown error occurred during verification');
        }

        try {
          const tokenParts = initialToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.email) setEmail(payload.email);
          }
        } catch (tokenError) {
          console.error('Failed to extract email from token:', tokenError);
        }
      }
    };

    verifyToken();
  }, [initialToken, nextStep]);

  const handleResendVerification = async () => {
    if (!email && !manualEmail) {
      setMessage('Cannot resend verification email: email address not found');
      return;
    }

    setIsResending(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const emailToUse = email || manualEmail;

    try {
      const response = await axios.post(`${apiUrl}/hosts/resend-verification`, {
        email: emailToUse,
      });

      if (response.data.success) {
        setResendSuccess(true);
        setMessage('A new verification email has been sent. Please check your inbox.');
      } else {
        throw new Error(response.data.message || 'Failed to resend verification email');
      }
    } catch (err) {
      const error = err;
      console.error('Error resending verification email:', error);
      setMessage(
        error.response?.data?.message ||
        error.message ||
        'Failed to resend verification email. Please try again later.'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleManualEmailSubmit = (e) => {
    e.preventDefault();
    handleResendVerification();
  };

  return (
    <div className={styles.verificationContainer}>
      {status === 'verifying' && (
        <div className={styles.verificationStatus}>
          <div className={styles.loadingSpinner}></div>
          <p>Verifying your email...</p>
        </div>
      )}

      {status === 'success' && (
        <div className={styles.successMessage}>
          <p>{message}</p>
          <p>You will be redirected automatically...</p>
        </div>
      )}

      {status === 'error' && !resendSuccess && (
        <div className={styles.errorMessage}>
          <p>{message}</p>
          <div className={styles.resendSection}>
            {email ? (
              <div>
                <p>Would you like us to send a new verification link?</p>
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className={styles.resendButton}
                >
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleManualEmailSubmit} className={styles.emailForm}>
                <p>Please enter your email to receive a new verification link:</p>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className={styles.emailInput}
                />
                <button
                  type="submit"
                  disabled={isResending || !manualEmail}
                  className={styles.resendButton}
                >
                  {isResending ? 'Sending...' : 'Send Verification Email'}
                </button>
              </form>
            )}
          </div>
          <button onClick={prevStep} className={styles.backButton}>
            Back
          </button>
        </div>
      )}

      {resendSuccess && (
        <div className={styles.resendSuccessMessage}>
          <p>A new verification email has been sent to your inbox.</p>
          <p>Please check your email and click on the verification link.</p>
          <button onClick={prevStep} className={styles.backButton}>
            Back
          </button>
        </div>
      )}

      {status === 'ready' && (
        <div className={styles.readyMessage}>
          <p>Please check your email for a verification link.</p>
          <div className={styles.buttonGroup}>
            <button onClick={prevStep} className={styles.backButton}>
              Back
            </button>
            <button onClick={nextStep} className={styles.nextButton} disabled>
              Verify Email to Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}