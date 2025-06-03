"use client";

import React, { useState } from "react";
import axios from "axios";
import styles from "./ForgotPassword.module.css";
import Popup from "./popup"; 

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");

    console.log("📧 Email envoyé:", email);

    try {
      const response = await axios.post(
        "http://localhost:3000/hosts/forgot-password",
        { email },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Réponse complète:", response);
      
      // Vérifier si la réponse contient une erreur malgré un statut 201
      if (response.data && response.data.error === 'User not found') {
        setPopupMessage("User not found. Please check your email address.");
        setPopupType("error");
        setShowPopup(true);
      } else {
        setMessage("An email has been sent with the reset link.");
        setPopupMessage("Email sent successfully!");
        setPopupType("success");
        setShowPopup(true);
      }
    } catch (error) {
      console.error("❌ Erreur détaillée:", error.response?.data || error.message);

      let errorMessage = "Error sending the mail. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      setPopupMessage(errorMessage);
      setPopupType("error");
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };


  const closePopup = () => {
    setShowPopup(false);
  };

  return (
    <div className={styles.container}>
      {/* Background image with blur */}
      <div className="fixed top-0 left-0 w-full h-full">
        <div className="w-full h-full bg-[url('/bg-city.jpg')] bg-cover bg-center filter blur-sm"></div>
      </div>
      
      {/* Form container */}
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
          
          <a href="/login" className={styles.link}>
            Back to login
          </a>
        </form>
      </div>
      
      {/* Popup pour afficher les messages */}
      {showPopup && (
        <Popup 
          message={popupMessage} 
          type={popupType} 
          onClose={closePopup} 
        />
      )}
    </div>
  );
};

export default ForgotPassword;