// pages/unauthorized/page.js
"use client";

import Link from 'next/link';
import { useAuth } from '../../src/context/AuthContext';
import { completeSignOut } from '../../src/firebase';
import { useRouter } from 'next/navigation';
import styles from './unauthorized.module.css';

export default function UnauthorizedPage() {
  const { user, userRole } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await completeSignOut();
    router.push('/Login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className={styles.icon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className={styles.title}>
            Access Denied
          </h2>
          <p className={styles.description}>
            You don't have permission to access this page.
          </p>
          {user && (
            <div className={styles.userInfo}>
              <p>
                <strong>Current user:</strong> {user.email}
              </p>
              <p>
                <strong>Your role:</strong> {userRole || 'Not assigned'}
              </p>
            </div>
          )}
        </div>
        <div className={styles.actions}>
          <Link 
            href="/" 
            className={styles.primaryButton}
          >
            Go to Home
          </Link>
          {user ? (
            <button
              onClick={handleSignOut}
              className={styles.secondaryButton}
            >
              Sign Out
            </button>
          ) : (
            <Link 
              href="/Login" 
              className={styles.secondaryButton}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}