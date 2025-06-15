"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from 'axios';
import styles from "./ResetPassword.module.css";

// Composant qui contient la logique avec useSearchParams
const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isTokenValid, setIsTokenValid] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      try {
        if (!token) {
          setErrorMessage('No token provided');
          setIsTokenValid(false);
          return;
        }
        
        const response = await axios.get(`http://localhost:3000/hosts/validate-reset-token?token=${token}`);
        const data = response.data;
        
        if (response.status === 200) {
          setIsTokenValid(true);
        } else {
          setErrorMessage(data.error || 'Invalid token');
          setIsTokenValid(false);
        }
      } catch (error) {
        console.error('Error during validation:', error);
        if (error.response && error.response.data) {
          setErrorMessage(error.response.data.error || 'Error validating token');
        } else {
          setErrorMessage('Error validating token');
        }
        setIsTokenValid(false);
      }
    };
    
    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(""); 

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post("http://localhost:3000/hosts/reset-password", {
        token,
        newPassword: password
      });

      const data = response.data;
      console.log("Server response:", data);

      if (data?.message === "✅ Password reset successfully") {
        setSuccessMessage("Password successfully reset!");
        setErrorMessage("");
      } else {
        setErrorMessage(data?.message || "Error during password reset.");
        setSuccessMessage("");
      }
    } catch (error) {
      console.error("Error during reset:", error);
      if (error.response && error.response.data) {
        setErrorMessage(error.response.data.error || "An error occurred while resetting the password.");
      } else {
        setErrorMessage("An error occurred while resetting the password.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTokenValid === null) {
    return (
      <div className={styles.loadingContainer}>
        {/* Background image with blur */}
        <div className="fixed top-0 left-0 w-full h-full">
          <div className="w-full h-full bg-[url('/bg-city.jpg')] bg-cover bg-center filter blur-sm"></div>
        </div>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Background image with blur */}
      <div className="fixed top-0 left-0 w-full h-full">
        <div className="w-full h-full bg-[url('/bg-city.jpg')] bg-cover bg-center filter blur-sm"></div>
      </div>
      
      <div className={styles.formContainer}>
        <h1 className={styles.title}>Reset Password</h1>
        
        {isTokenValid === false && (
          <>
            <div className={styles.errorMessage}>{errorMessage}</div>
            <div className={styles.centeredContent}>
              <a href="/forgot-password" className={styles.link}>
                Back to Forgot Password
              </a>
            </div>
          </>
        )}
        
        {successMessage && isTokenValid && (
          <div className={styles.successMessage}>
            <p>{successMessage}</p>
            <div className={styles.centeredContent}>
              <a href="/login" className={styles.link}>
                Back to Login
              </a>
            </div>
          </div>
        )}
        
        {!successMessage && isTokenValid && (
          <>
            {errorMessage && (
              <div className={styles.errorMessage}>
                {errorMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  New Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.button}
              >
                {isSubmitting ? "Loading..." : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// Composant de fallback pour le chargement
const LoadingFallback = () => (
  <div className={styles.container}>
    <div className="fixed top-0 left-0 w-full h-full">
      <div className="w-full h-full bg-[url('/bg-city.jpg')] bg-cover bg-center filter blur-sm"></div>
    </div>
    <div className={styles.formContainer}>
      <p className={styles.loadingText}>Loading...</p>
    </div>
  </div>
);

// Composant principal avec Suspense
const ResetPasswordPage = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
};

export default ResetPasswordPage;