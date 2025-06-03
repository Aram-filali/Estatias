'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from './VerifyEmail.module.css';

export default function VerifyEmail({ initialToken }) {
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    // Handle missing token
    if (!initialToken) {
      console.log("No token provided, stopping verification");
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Get API URL from environment or use default
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Verify token
    const verifyToken = async () => {
      try {
        console.log("Starting token verification...");
        const endpointUrl = `${apiUrl}/users/verify-email`;
        console.log(`Making request to: ${endpointUrl}`);
        
        // Make the request to the API endpoint
        const response = await axios({
          method: 'post',  // Using POST for security with tokens
          url: endpointUrl,
          data: { token: initialToken },
          headers: {
            'Content-Type': 'application/json'
          },
          maxRedirects: 5, // Allow redirects
          validateStatus: function (status) {
            return status >= 200 && status < 500; // Accept a broader range of status codes
          }
        });
        
        console.log('Verification API response:', response.data);
        
        // Check if we got an error status in the response
        if (response.data.error || response.status >= 400) {
          throw new Error(response.data.message || 'Verification failed');
        }
        
        // Handle successful verification
        setStatus('success');
        setMessage(response.data.message || 'Your email has been successfully verified!');
        
        // Store verification status in localStorage (optional)
        try {
          localStorage.setItem('emailVerified', 'true');
        } catch (storageError) {
          console.warn('Could not store verification status:', storageError);
        }
        
        // Suppression de la redirection automatique après succès
        // router.push('/Login');  <- Cette ligne a été supprimée
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        
        // Extract most relevant error message
        if (error.response && error.response.data) {
          if (typeof error.response.data === 'string') {
            setMessage(error.response.data);
          } else if (error.response.data.message) {
            setMessage(error.response.data.message);
          } else {
            setMessage(`Server error: ${error.response.status}`);
          }
        } else if (error.request) {
          setMessage('No response from server. Please check your network connection and try again.');
        } else {
          setMessage(error.message || 'An unknown error occurred during verification');
        }
      }
    };
    
    verifyToken();
  }, [initialToken, router]);
  
  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.title}>
          {status === 'verifying' ? 'Verifying Email...' :
           status === 'success' ? 'Email Verified!' : 'Verification Failed'}
        </h1>
        
        <div className={styles.centeredContent}>
          {status === 'verifying' && (
            <div className={styles.spinner}></div>
          )}
          
          {status === 'success' && (
            <div className={styles.successMessage}>{message}</div>
          )}
          
          {status === 'error' && (
            <div className={styles.errorMessage}>{message}</div>
          )}
          
          {/* Pour le cas où le message doit être affiché pendant la vérification */}
          {status === 'verifying' && message && (
            <p className={styles.loadingText}>{message}</p>
          )}
          
          {status === 'success' && (
            <button
              onClick={() => router.push('/Login')}
              className={styles.button}
            >
              Go to Login
            </button>
          )}
          
          {status === 'error' && (
            <button
              onClick={() => router.push('/Login')}
              className={styles.button}
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}