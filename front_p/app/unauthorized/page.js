// app/unauthorized/page.js
"use client";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { completeSignOut } from '@/contexts/firebaseConfig';
import styles from './unauthorized.module.css';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { userRole, user } = useAuth();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleLogout = async () => {
    await completeSignOut();
    router.push('/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <svg
            className={styles.icon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <h1 className={styles.title}>
          Access Denied
        </h1>
        
        <p className={styles.description}>
          You don't have permission to access this page.
          {user && userRole && (
            <span className={styles.roleInfo}>
              Current role: <span className={styles.roleText}>{userRole}</span>
            </span>
          )}
        </p>
        
        <div className={styles.buttonContainer}>
          <button
            onClick={handleGoHome}
            className={`${styles.button} ${styles.primaryButton}`}
          >
            Go to Home
          </button>
          
          {user ? (
            <button
              onClick={handleLogout}
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              Logout & Login as Different User
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}