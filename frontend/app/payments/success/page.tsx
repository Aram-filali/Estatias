// app/payment/success/page.tsx
'use client';


import styles from './success.module.css';

export default function PaymentSuccessPage() {
 

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <div className={styles.checkIcon}>
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>
        
        <h1 className={styles.title}>Payment Successful!</h1>
        
        <p className={styles.description}>
          Thank you for your payment. Your booking has been confirmed successfully.
        </p>

        <div className={styles.emailNotice}>
          <div className={styles.emailIcon}>
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <h3 className={styles.emailTitle}>Check Your Email</h3>
            <p className={styles.emailText}>
              We've sent you a confirmation email with your booking details and billing information.
            </p>
          </div>
        </div>


        <div className={styles.actions}>
          <button 
            className={styles.primaryButton}
            onClick={() => window.location.href = '/'}
          >
            Return to Home
          </button>
          <button 
            className={styles.secondaryButton}
            onClick={() => window.location.href = '/MyBooking'}
          >
            View My Bookings
          </button>
        </div>
      </div>
    </div>
  );
}