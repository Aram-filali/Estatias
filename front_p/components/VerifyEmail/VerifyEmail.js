'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from './VerifyEmail.module.css';

// This is a standalone component that will be used when accessing via direct URL
export default function VerifyEmail() {
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialToken = urlParams.get('token');
    
    if (!initialToken) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

// Configuration de l'URL de base de l'API
const getApiBaseUrl = () => {
  // En développement, utilisez localhost
  return 'http://localhost:3000';
};

const verifyToken = async () => {
  try {
    const apiUrl = getApiBaseUrl();
    const endpointUrl = `${apiUrl}/hosts/verify-email`;
    
    console.log('API Base URL:', apiUrl);
    console.log('Verification endpoint:', endpointUrl);
    
    const response = await axios({
      method: 'post',
      url: endpointUrl,
      data: { token: initialToken },
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
    } catch (storageError) {
      console.warn('Could not store verification status:', storageError);
    }
    
  } catch (error) {
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
}, [router]);

const handleResendVerification = async () => {
  if (!email && !manualEmail) {
    setMessage('Cannot resend verification email: email address not found');
    return;
  }

  setIsResending(true);
  const apiUrl = getApiBaseUrl();
  const emailToUse = email || manualEmail;

  console.log('Resending verification to:', emailToUse);
  console.log('Using API URL:', apiUrl);

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
  } catch (error) {
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
  
  const navigateToSignup = () => {
    router.push('/host-signup');
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.background}></div>
      
      <div className={styles.content}>
        <h1 className={styles.stepTitle}>
          {status === 'verifying' ? 'Verifying Email...' :
           status === 'success' ? 'Email Verified!' : 'Verification Failed'}
        </h1>
        
        <div className={styles.stepContent}>
          {status === 'verifying' && (
            <div className={styles.verificationStatus}>
              <div className={styles.loadingSpinner}></div>
              <p>Verifying your email address...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className={styles.successMessage}>
              <p>{message}</p>
              <p>Redirecting you to continue registration...</p>
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
              <div className={styles.buttonGroup}>
                <button onClick={navigateToSignup} className={styles.backButton}>
                  Return to Registration
                </button>
              </div>
            </div>
          )}

          {resendSuccess && (
            <div className={styles.resendSuccessMessage}>
              <p>A new verification email has been sent to your inbox.</p>
              <p>Please check your email and click on the verification link.</p>
              <div className={styles.buttonGroup}>
                <button onClick={navigateToSignup} className={styles.backButton}>
                  Return to Registration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}