'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import styles from './VerifyEmail.module.css';

export default function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  // Récupérer les données utilisateur et vérifier l'état de vérification au chargement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('userSignupData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        if (parsedData.email) {
          setEmail(parsedData.email);
        }
      }

      const progress = localStorage.getItem('userSignupProgress');
      if (progress) {
        const parsedProgress = JSON.parse(progress);
        if (parsedProgress.emailVerified) {
          // Si l'email est déjà vérifié dans localStorage
          setAlreadyVerified(true);
          setInitialCheckComplete(true);
          // Ne pas définir isNavigating ici pour permettre à l'utilisateur de voir l'état
        } else {
          // Si l'email n'est pas encore vérifié dans localStorage, vérifions sur le serveur
          checkEmailVerificationStatus();
        }
      } else {
        // Si aucune progression n'est trouvée, vérifions sur le serveur
        checkEmailVerificationStatus();
      }
    }
  }, [router]);

  // Fonction pour vérifier l'état de vérification de l'email sur le serveur
  const checkEmailVerificationStatus = async () => {
    if (!email) {
      setInitialCheckComplete(true);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await axios({
        method: 'post',
        url: `${apiUrl}/hosts/check-verification-status`,
        data: { email },
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (status) => status >= 200 && status < 500,
      });

      if (response.data.verified) {
        // L'email est déjà vérifié selon le serveur
        setAlreadyVerified(true);
        
        // Mettre à jour localStorage
        if (typeof window !== 'undefined') {
          const progress = localStorage.getItem('userSignupProgress');
          if (progress) {
            const parsedProgress = JSON.parse(progress);
            localStorage.setItem('userSignupProgress', JSON.stringify({
              ...parsedProgress,
              emailVerified: true,
              step: 'email_verified',
              timestamp: new Date().toISOString(),
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to check email verification status:', error);
    } finally {
      setInitialCheckComplete(true);
    }
  };

  useEffect(() => {
    if (!token) return;

    const verifyToken = async (tokenToVerify) => {
      try {
        setVerifying(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const endpointUrl = `${apiUrl}/hosts/verify-email`;

        const response = await axios({
          method: 'post',
          url: endpointUrl,
          data: { token: tokenToVerify },
          headers: { 'Content-Type': 'application/json' },
          validateStatus: (status) => status >= 200 && status < 500,
        });

        if (response.data.error || response.status >= 400) {
          throw new Error(response.data.message || 'Verification failed');
        }

        const success = response.data.success;
        if (success) {
          if (typeof window !== 'undefined') {
            const progress = localStorage.getItem('userSignupProgress');
            if (progress) {
              const parsedProgress = JSON.parse(progress);
              localStorage.setItem('userSignupProgress', JSON.stringify({
                ...parsedProgress,
                emailVerified: true,
                step: 'email_verified',
                timestamp: new Date().toISOString(),
              }));
            }
          }
          setVerified(true);

          // Set timeout for redirection after verification success
          setTimeout(() => {
            setIsNavigating(true);
            router.push('/create-site/add-property');
          }, 5000); // Reduced to 5 seconds for better UX
        } else {
          setError('The verification link is invalid or has expired. Please try again.');
        }
      } catch (err) {
        console.error('Error verifying email:', err);
        setError('An error occurred during verification. Please try again.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken(token);
  }, [token, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  const handleResendEmail = async () => {
    setResendDisabled(true);
    setCountdown(60);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await axios({
        method: 'post',
        url: `${apiUrl}/hosts/resend-verification`,
        data: { email },
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.data.success) {
        // Vérifier si l'email est déjà vérifié
        if (response.data.message && response.data.message.includes('already verified')) {
          setAlreadyVerified(true);
          
          // Mettre à jour localStorage
          if (typeof window !== 'undefined') {
            const progress = localStorage.getItem('userSignupProgress');
            if (progress) {
              const parsedProgress = JSON.parse(progress);
              localStorage.setItem('userSignupProgress', JSON.stringify({
                ...parsedProgress,
                emailVerified: true,
                step: 'email_verified',
                timestamp: new Date().toISOString(),
              }));
            }
          }
        } else {
          // Message de succès pour les emails non vérifiés
          alert('Verification email resent successfully!');
        }
      } else {
        alert('Failed to send email. Please try again.');
        setResendDisabled(false);
        setCountdown(0);
      }
    } catch (error) {
      console.error('Failed to resend email:', error);
      alert('Failed to send email. Please try again.');
      setResendDisabled(false);
      setCountdown(0);
    }
  };

  const handleManualContinue = () => {
    setIsNavigating(true);
    router.push('/create-site/add-property');
  };

  // Afficher un loader pendant la vérification initiale
  if (!initialCheckComplete || verifying) {
    return (
      <div className={styles.container1}>
        <div className={styles.contentBox1}>
          <div className={styles.loadingSpinner1}></div>
          <p className={styles.subtitle1}>Verifying your email status...</p>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className={styles.container1}>
        <div className={styles.contentBox1}>
          <div className={styles.checkIcon1}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 111.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className={styles.title1}>Email successfully verified!</h1>
          <p className={styles.subtitle1}>Your email was verified.</p>
        </div>
      </div>
    );
  }

  if (alreadyVerified) {
    return (
      <div className={styles.container1}>
        <div className={styles.contentBox1}>
          <div className={styles.checkIcon1}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 111.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className={styles.title1}>Email already verified!</h1>
          <p className={styles.subtitle1}>Your email is already verified.</p>
          {isNavigating && (
            <div className={styles.loadingSpinner1}></div>
          )}
          <div className={styles.buttonContainer1}>
            <button onClick={handleManualContinue} className={styles.button1}>
              Continue now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (token && error) {
    return (
      <div className={styles.container1}>
        <div className={styles.contentBox1}>
          <div className={styles.icon1}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E53E3E" width="80" height="80">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className={styles.title1}>Verification failed</h1>
          <p className={styles.subtitle1}>{error}</p>

          <div className={styles.infoBox1}>
            <p>We sent a verification email to:</p>
            <p className={styles.emailHighlight1}>{email}</p>
            <p>Please check your inbox and click the verification link.</p>
          </div>

          <div className={styles.buttonContainer1}>
            <button
              onClick={handleResendEmail}
              disabled={resendDisabled}
              className={styles.button1}
            >
              {resendDisabled ? `Resend email (${countdown}s)` : 'Resend email'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container1}>
      <div className={styles.contentBox1}>
        <h1 className={styles.title1}>Check your email</h1>

        <div className={styles.infoBox1}>
         {/* <p>We sent a verification email to:</p>
          <p className={styles.emailHighlight1}>{email}</p>*/}
          <p>Please check your inbox and click the verification link to continue.</p>
        </div>

        <div className={styles.buttonContainer1}>
          <button
            onClick={handleResendEmail}
            disabled={resendDisabled || isNavigating}
            className={styles.button1}
          >
            {resendDisabled ? `Resend email (${countdown}s)` : 'Resend email'}
          </button>
        </div>

        <div className={styles.helpText1}>
          <p>Don't see the email? Check your spam folder or click "Resend email".</p>
          <p>
            Need help? <a href="#" className={styles.link1}>Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
}