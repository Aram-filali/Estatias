// app/dashboard/connect/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styles from './styles/connect.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ConnectAccount {
  accountId: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  accountLink?: string;
  bankAccount?: {
    last4: string;
    country: string;
    currency: string;
    status: string;
  };
  accountStatus?: any;
}

export default function ConnectAccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [connectAccount, setConnectAccount] = useState<ConnectAccount | null>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          setUserId(user.uid);
          await fetchConnectAccount(user.uid, token);
        } catch (err) {
          console.error("Error getting authentication token:", err);
          setError("Authentication error. Please try logging in again.");
        } finally {
          setLoading(false);
        }
      } else {
        setError("You must be logged in to view this page.");
        setLoading(false);
        router.push('/login');
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  const fetchConnectAccount = async (hostId: string, token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/connect/account/${hostId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnectAccount(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Account doesn't exist yet, which is fine
        setConnectAccount(null);
      } else {
        console.error("Error fetching connect account:", err);
        setError("Failed to fetch your payment account details.");
      }
    }
  };

  const createConnectAccount = async () => {
    if (!userId || !authToken) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/connect/account`,
        { firebaseUid: userId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setConnectAccount(response.data);
      
      // Redirect to Stripe onboarding if link is available
      if (response.data.accountLink) {
        window.location.href = response.data.accountLink;
      }
    } catch (err) {
      console.error("Error creating connect account:", err);
      setError("Failed to create your payment account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refreshAccountLink = async () => {
    if (!userId || !authToken) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/connect/account/${userId}/refresh`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      // Redirect to the new onboarding link
      if (response.data.accountLink) {
        window.location.href = response.data.accountLink;
      }
    } catch (err) {
      console.error("Error refreshing account link:", err);
      setError("Failed to refresh your onboarding link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className={styles.spinnerContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.alertError} role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Payment Account Setup</h1>
      
      {!connectAccount ? (
        <div className={styles.card}>
          <h2 className={styles.subtitle}>Connect Your Bank Account</h2>
          <p className={styles.text}>
            To receive payments from guests, you need to connect your bank account through our payment processor.
            This allows us to securely transfer your earnings directly to your bank account.
          </p>
          <p className={styles.textMuted}>
            You will be redirected to Stripe Connect to securely provide your banking information.
            Your financial information is never stored on our servers.
          </p>
          <button
            onClick={createConnectAccount}
            disabled={loading}
            className={styles.buttonPrimary}
          >
            {loading ? 'Setting up...' : 'Connect Bank Account'}
          </button>
        </div>
      ) : !connectAccount.detailsSubmitted ? (
        <div className={styles.card}>
          <h2 className={styles.subtitle}>Complete Your Account Setup</h2>
          <p className={styles.text}>
            You've started setting up your payment account, but you need to complete the process
            to receive payments from bookings.
          </p>
          <div className={`${styles.alert} ${styles.alertWarning}`}>
            <p>
              Your account setup is incomplete. Please complete the onboarding process to receive payments.
            </p>
          </div>
          <button
            onClick={refreshAccountLink}
            className={styles.buttonPrimary}
          >
            Continue Setup
          </button>
        </div>
      ) : !connectAccount.payoutsEnabled ? (
        <div className={styles.card}>
          <h2 className={styles.subtitle}>Account Verification In Progress</h2>
          <p className={styles.text}>
            Your account details have been submitted and are being verified. This process can take 1-2 business days.
          </p>
          <div className={`${styles.alert} ${styles.alertWarning}`}>
            <p>
              Your account is being verified. You'll be able to receive payments once verification is complete.
            </p>
          </div>
          {connectAccount.accountStatus?.currently_due?.length > 0 && (
            <div className={styles.actionRequired}>
              <p className={styles.actionRequiredTitle}>Additional information needed:</p>
              <ul className={styles.actionRequiredList}>
                {connectAccount.accountStatus.currently_due.map((item: string, index: number) => (
                  <li key={index} className={styles.actionRequiredItem}>{item.replace(/_/g, ' ')}</li>
                ))}
              </ul>
              <button
                onClick={refreshAccountLink}
                className={styles.buttonSecondary}
              >
                Provide Additional Information
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.successIndicator}>
            <div className={styles.successIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className={`${styles.subtitle} ml-3`}>Account Successfully Connected</h2>
          </div>
          
          <p className={styles.text}>
            Your bank account has been successfully connected and verified. You're all set to receive payments from bookings!
          </p>
          
          {connectAccount.bankAccount && (
            <div className={styles.bankInfo}>
              <h3 className={styles.bankInfoTitle}>Connected Bank Account</h3>
              <p className={styles.bankInfoText}>
                Account ending with: •••• {connectAccount.bankAccount.last4}
              </p>
              <p className={styles.bankInfoText}>
                Country: {connectAccount.bankAccount.country}
              </p>
              <p className={styles.bankInfoText}>
                Currency: {connectAccount.bankAccount.currency.toUpperCase()}
              </p>
            </div>
          )}
          
          {connectAccount.accountStatus?.currently_due?.length > 0 && (
            <div className={styles.actionRequired}>
              <p className={styles.actionRequiredTitle}>Action required:</p>
              <ul className={styles.actionRequiredList}>
                {connectAccount.accountStatus.currently_due.map((item: string, index: number) => (
                  <li key={index} className={styles.actionRequiredItem}>{item.replace(/_/g, ' ')}</li>
                ))}
              </ul>
              <button
                onClick={refreshAccountLink}
                className={styles.buttonSecondary}
              >
                Update Account Information
              </button>
            </div>
          )}
          
          <div className={styles.buttonContainer}>
            <button
              onClick={handleGoBack}
              className={styles.buttonSecondary}
            >
              Go Back
            </button>
          </div>
        </div>
      )}
      
      <div className={styles.alertInfo}>
        <h3 className="font-medium text-blue-800">About Payment Processing</h3>
        <p className="mt-2 text-blue-700">
          If you're on our Premium plan, you'll receive 100% of your booking amount directly.
          Standard plan hosts receive 95% of the booking amount (5% platform fee applies).
        </p>
      </div>
    </div>
  );
}