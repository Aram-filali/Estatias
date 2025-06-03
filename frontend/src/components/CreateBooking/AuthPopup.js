import { useState, useEffect } from 'react';
import styles from './AuthPopup.module.css';

const AuthPopup = ({ 
  onLogin, 
  onSignup,  
  isVisible = true,
  loading = false,
  title = "Authentication Required",
  description = "Please login or create an account to update your booking.",
  showSocialLogin = false,
  horizontalLayout = false 
}) => {
  const [isLoading, setIsLoading] = useState(loading);

  // Handle escape key press
  /*useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isVisible, onClose]);*/

  // Handle backdrop click
   const handleBackdropClick = (e) => {
    // Prevent closing on backdrop click
    e.stopPropagation();
  };
  

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await onLogin?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    setIsLoading(true);
    try {
      await onSignup?.();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    try {
      // Handle social login logic here
      console.log(`Login with ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="auth-title">
        {/* Close Button 
        {onClose && (
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close authentication dialog"
            disabled={isLoading}
          >
            <svg className={styles.closeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}*/}

        <div className={styles.content}>
          <h2 id="auth-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.description}>
            {description}
          </p>
          
          {/* Social Login Options */}
          {showSocialLogin && (
            <>
              <div className={styles.buttonContainer}>
                <button
                  onClick={() => handleSocialLogin('google')}
                  className={styles.socialButton}
                  disabled={isLoading}
                >
                  <svg className={styles.socialIcon} viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
                
                <button
                  onClick={() => handleSocialLogin('facebook')}
                  className={styles.socialButton}
                  disabled={isLoading}
                >
                  <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continue with Facebook
                </button>
              </div>
              
              <div className={styles.divider}>
                <span className={styles.dividerText}>or</span>
              </div>
            </>
          )}
          
          {/* Main Auth Buttons */}
          <div className={horizontalLayout ? styles.buttonContainerHorizontal : styles.buttonContainer}>
            <button
              onClick={handleLogin}
              className={styles.primaryButton}
              disabled={isLoading}
            >
              {isLoading && <span className={styles.loadingSpinner}></span>}
              {isLoading ? 'Please wait...' : 'Login'}
            </button>
            
            <button
              onClick={handleSignup}
              className={styles.secondaryButton}
              disabled={isLoading}
            >
              Sign Up
            </button>
          </div>

          {/* Footer Links */}
          <div className={styles.footer}>
            <p>
              Forgot your password?{' '}
              <a href="#" className={styles.footerLink} onClick={(e) => {
                e.preventDefault();
                console.log('Reset password clicked');
              }}>
                Reset it here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Usage example of the original component:
const OriginalAuthPopup = ({ handleLogin, handleSignup }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.content}>
          <h2 className={styles.title}>
            Authentication Required
          </h2>
          <p className={styles.description}>
            Please login or create an account to update your booking.
          </p>
          
          <div className={styles.buttonContainer}>
            <button
              onClick={handleLogin}
              className={styles.primaryButton}
            >
              Login
            </button>
            
            <button
              onClick={handleSignup}
              className={styles.secondaryButton}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPopup;
export { OriginalAuthPopup };