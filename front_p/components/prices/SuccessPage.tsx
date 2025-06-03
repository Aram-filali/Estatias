"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from "./success.module.css";

const SuccessPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countDown, setCountDown] = useState(40);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const siteUrl = searchParams.get('url');

  // Set up countdown timer for 40 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountDown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(timer);
          setShouldRedirect(true);
          return 0;
        }
        return prevCount - 1;
      });
    }, 600000);

    // Clear the interval when component unmounts
    return () => clearInterval(timer);
  }, []);

  // Handle redirect in a separate effect
  useEffect(() => {
    if (shouldRedirect) {
      router.push('/dashboard');
    }
  }, [shouldRedirect, router]);

  return (
    <div className={styles.container}>
      {/* Background image with blur */}
      <div className={styles.backgroundWrapper}>
        <div className={styles.backgroundImage}></div>
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.formContainer}>
          <div className={styles.centeredContent}>
            <div className={styles.successIcon}>
              <svg className={styles.checkIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h3 className={styles.title}>Site Generated Successfully!</h3>
          
          <p className={styles.messageText}>
            Your website has been created and is now available at:
          </p>
          
          {siteUrl && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.siteUrlButton}
            >
              {siteUrl}
            </a>
          )}
          
          
          <div className={styles.centeredContent}>
            <button
              onClick={() => router.push('/dashboard')}
              className={styles.button}
            >
              <span>Go to Dashboard</span>
              <svg xmlns="http://www.w3.org/2000/svg" className={styles.buttonIcon} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;