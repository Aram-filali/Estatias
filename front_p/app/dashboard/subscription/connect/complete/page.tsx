// app/dashboard/connect/complete/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from '../styles/connect.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ConnectComplete() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Confirming your account setup...');
  const router = useRouter();
  
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          
          // Fetch updated account status
          const response = await axios.get(
            `${API_BASE_URL}/connect/account/${user.uid}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Update message based on account status
          if (response.data.detailsSubmitted) {
            if (response.data.payoutsEnabled) {
              setMessage('Your account setup is complete! You can now receive payments.');
            } else {
              setMessage('Your account information has been submitted and is being verified.');
            }
          } else {
            setMessage('Your account setup is incomplete. Please complete all required information.');
          }
          
          // Redirect to the main Connect page after a delay
          setTimeout(() => {
            router.push('/dashboard/subscription/connect');
          }, 3000);
          
        } catch (error) {
          console.error('Error verifying account status:', error);
          setMessage('An error occurred while confirming your account status.');
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });
    
    return () => unsubscribe();
  }, [router]);
  
  return (
    <div className={styles.centeredContainer}>
      <div className={styles.cardCentered}>
        {loading ? (
          <div className={styles.spinnerCentered}>
            <div className={styles.spinner}></div>
            <p className={styles.textMuted}>{message}</p>
          </div>
        ) : (
          <div className={styles.spaceY4}>
            <div className={styles.completionIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className={styles.completionTitle}>Thank You!</h2>
            <p className={styles.textMuted}>{message}</p>
            <p className={styles.completionMessage}>Returning to dashboard in a few seconds...</p>
          </div>
        )}
      </div>
    </div>
  );
}