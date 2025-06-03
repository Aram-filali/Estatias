// app/dashboard/connect/refresh/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import styles from '../styles/connect.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ConnectRefresh() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          
          // Refresh the account link
          const response = await axios.post(
            `${API_BASE_URL}/connect/account/${user.uid}/refresh`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Redirect to the new onboarding URL
          if (response.data && response.data.accountLink) {
            window.location.href = response.data.accountLink;
          } else {
            // If for some reason there's no new link, go back to the connect page
            router.push('/dashboard/connect');
          }
          
        } catch (error) {
          console.error('Error refreshing account link:', error);
          router.push('/dashboard/connect');
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
        <div className={styles.spinnerCentered}>
          <div className={styles.spinner}></div>
          <p className={styles.textMuted}>Refreshing your account setup...</p>
        </div>
      </div>
    </div>
  );
}