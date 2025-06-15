"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import styles from "./ResetPassword.module.css";

const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const paramToken = searchParams?.get("token");
    if (paramToken) setToken(paramToken);
  }, [searchParams]);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) return;

      try {
        const response = await axios.get(
          `http://localhost:3000/users/validate-reset-token?token=${token}`
        );

        if (response.status === 200) {
          setIsTokenValid(true);
        } else {
          setErrorMessage(response.data?.error || "Invalid token");
          setIsTokenValid(false);
        }
      } catch (error: any) {
        console.error("Error during validation:", error);
        setErrorMessage(
          error?.response?.data?.error || "Error validating token"
        );
        setIsTokenValid(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(
        "http://localhost:3000/users/reset-password",
        {
          token,
          newPassword: password,
        }
      );

      const data = response.data;
      if (data?.message === "✅ Password reset successfully") {
        setSuccessMessage("Password successfully reset!");
        setErrorMessage("");
      } else {
        setErrorMessage(data?.message || "Error during password reset.");
        setSuccessMessage("");
      }
    } catch (error: any) {
      console.error("Error during reset:", error);
      setErrorMessage(
        error?.response?.data?.error ||
          "An error occurred while resetting the password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTokenValid === null) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (isTokenValid === false) {
    return (
      <div className={styles.container}>
        <div className={styles.formContainer}>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <div className={styles.centeredContent}>
            <a href="/forgetPassword" className={styles.link}>
              Back to Forgot Password
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.title}>Reset Password</h1>

        {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

        {successMessage && (
          <div className={styles.successMessage}>
            <p>{successMessage}</p>
            <div className={styles.centeredContent}>
              <a href="/Login" className={styles.link}>
                Back to Login
              </a>
            </div>
          </div>
        )}

        {!successMessage && (
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
        )}
      </div>
    </div>
  );
};

const ResetPassword = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
};

export default ResetPassword;