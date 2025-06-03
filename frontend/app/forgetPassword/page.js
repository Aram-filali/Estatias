"use client";

import React, { useState } from "react";
import axios from "axios";
import styles from "./ForgotPassword.module.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");
  
    try {
      const response = await axios.post(
        "http://localhost:3000/users/forgot-password",
        { email },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
  
      if (response.data.status === 'success') {
        setMessage(response.data.message);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error("Error:", error);
      
      // Gestion améliorée des erreurs
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || "An unknown error occurred";
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.form}>
        <h2 className={styles.title}>Forgot Password</h2>

        {message && <div className={styles.message}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.formContent} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Enter your email
            </label>
            <input
              type="email"
              id="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className={styles.button}
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
          
          <div className={styles.linkContainer}>
            <a href="/Login" className={styles.link}>
              Back to login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;