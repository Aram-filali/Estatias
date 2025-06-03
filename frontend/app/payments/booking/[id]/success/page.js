'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaCheckCircle } from 'react-icons/fa';
import Link from 'next/link';
import styles from './PaymentSuccessPage.module.css';

export default function PaymentSuccessPage({ params }) {
  const { id } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentMethod = searchParams.get('method');
  
  // After 10 seconds, redirect to dashboard (if you have one)
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  const isOfflinePayment = paymentMethod === 'cash' || paymentMethod === 'check';
  
  return (
    <div className={styles.successContainer}>
      <div className={styles.successCard}>
        <div className={styles.iconContainer}>
          <FaCheckCircle className={styles.successIcon} />
        </div>
        
        <h1 className={styles.pageTitle}>
          {isOfflinePayment ? 'Booking Confirmed!' : 'Payment Successful!'}
        </h1>
        
        {isOfflinePayment ? (
          <p className={styles.successMessage}>
            Your booking has been confirmed. You have chosen to pay by {paymentMethod}.
            The host will contact you soon with payment instructions.
          </p>
        ) : (
          <p className={styles.successMessage}>
            Your payment has been processed successfully.
            A confirmation email with booking details has been sent to your email address.
          </p>
        )}
        
        <div className={styles.referenceBox}>
          <p className={styles.referenceText}>
            Booking Reference: <span className={styles.referenceNumber}>{id}</span>
          </p>
          <p className={styles.referenceText}>Please save this reference for your records.</p>
        </div>
        
        <p className={styles.redirectMessage}>
          You will be redirected to the dashboard in 10 seconds...
        </p>
        
        <div className={styles.buttonContainer}>
          <Link 
            href="/dashboard" 
            className={styles.primaryButton}
          >
            Go to Dashboard
          </Link>
          
          <button
            onClick={() => window.print()}
            className={styles.secondaryButton}
          >
            Print Receipt
          </button>
        </div>
      </div>
      
      <div className={styles.footerText}>
        <p>
          If you have any questions regarding your booking, please contact customer support.
        </p>
      </div>
    </div>
  );
}