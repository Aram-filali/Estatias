// app/payment/cancel/page.tsx
'use client';


import styles from './cancel.module.css';

export default function PaymentCancelPage() {
 

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <div className={styles.cancelIcon}>
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        </div>
        
        <h1 className={styles.title}>Payment Canceled</h1>
        
        <p className={styles.description}>
          Your payment has been canceled and no charges have been made to your account.
        </p>

        <div className={styles.infoNotice}>
          <div className={styles.infoIcon}>
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div>
            <h3 className={styles.infoTitle}>What happens next?</h3>
            <p className={styles.infoText}>
              Your booking has not been confirmed. You can try again or contact our support team if you need assistance.
            </p>
          </div>
        </div>

        

        <div className={styles.actions}>
          <button 
            className={styles.primaryButton}
            onClick={() => window.history.back()}
          >
            Try Payment Again
          </button>
          <button 
            className={styles.secondaryButton}
            onClick={() => window.location.href = '/'}
          >
            Return to Home
          </button>
          <button 
            className={styles.tertiaryButton}
            onClick={() => window.location.href = '/contact'}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}