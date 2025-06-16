// Enhanced Login.js with Robust Frontend Validation
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { initializeFormToggle2 } from "../../src/Login/formToggle2";
import { signInWithGoogle, completeSignOut } from "../../src/firebase";
import Link from "next/link";
import { saveUserProfile } from "../../src/Navbar/profileUtils";
import Popup from "./popup";
import { signInWithEmailAndPassword, getAuth } from 'firebase/auth';

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(true); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("error");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    initializeFormToggle2();
    
    setTimeout(() => {
      setIsSignUp(false);
    }, 800);
  }, []);

  const displayPopup = (message, type, duration = 5000) => {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
    
    setTimeout(() => setShowPopup(false), duration);
  };

  // Enhanced validation functions
  const validateEmail = (email) => {
    // More comprehensive email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim());
  };

  const validatePassword = (password) => {
    return password && password.length >= 8;
  };

  const validateFullName = (fullname) => {
    // Trim whitespace and check if it has at least 2 non-whitespace characters
    const trimmed = fullname.trim();
    return trimmed.length >= 2 && /^[a-zA-Z\s]+$/.test(trimmed);
  };

  // Sanitize input function
  const sanitizeInput = (input) => {
    return input.trim();
  };

  // Comprehensive form validation
  const validateSignupForm = () => {
    const errors = [];
    
    // Sanitize inputs
    const sanitizedFullName = sanitizeInput(fullname);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password; // Don't trim password
    
    // Check if fields are empty
    if (!sanitizedFullName) {
      errors.push("Full name is required");
    }
    if (!sanitizedEmail) {
      errors.push("Email is required");
    }
    if (!sanitizedPassword) {
      errors.push("Password is required");
    }
    
    // If any field is empty, return early
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    
    // Validate full name
    if (!validateFullName(sanitizedFullName)) {
      errors.push("Full name must be at least 2 characters and contain only letters and spaces");
    }
    
    // Validate email format
    if (!validateEmail(sanitizedEmail)) {
      errors.push("Please enter a valid email address");
    }
    
    // Validate password
    if (!validatePassword(sanitizedPassword)) {
      errors.push("Password must be at least 8 characters long");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        fullname: sanitizedFullName,
        email: sanitizedEmail.toLowerCase(), // Normalize email to lowercase
        password: sanitizedPassword
      }
    };
  };

  const validateLoginForm = () => {
    const errors = [];
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = password; // Don't trim password
    
    // Check if fields are empty
    if (!sanitizedEmail) {
      errors.push("Email is required");
    }
    if (!sanitizedPassword) {
      errors.push("Password is required");
    }
    
    // If any field is empty, return early
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    
    // Validate email format
    if (!validateEmail(sanitizedEmail)) {
      errors.push("Please enter a valid email address");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        email: sanitizedEmail.toLowerCase(), // Normalize email to lowercase
        password: sanitizedPassword
      }
    };
  };

  // Enhanced signup with robust validation
  const handleSubmitSignup = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setError("");
    setSuccess(false);
    setIsSubmitting(true);
    
    try {
      // Validate form
      const validation = validateSignupForm();
      
      if (!validation.isValid) {
        const errorMessage = validation.errors.join(", ");
        setError(errorMessage);
        displayPopup(errorMessage, "error");
        return;
      }
      
      const { sanitizedData } = validation;
      
      console.log("Sending signup data:", {
        fullname: sanitizedData.fullname,
        email: sanitizedData.email,
        passwordLength: sanitizedData.password.length
      });
      
      const response = await axios.post(`${API_BASE_URL}/users/signup`, {
        fullname: sanitizedData.fullname,
        email: sanitizedData.email,
        password: sanitizedData.password,
        role: "user",
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000
      });
      
      if (response.data) {
        setSuccess(true);
        displayPopup(
          "Account created successfully! Please check your email to verify your account before logging in.", 
          "success", 
          8000
        );
        
        // Clear form fields
        setFullName("");
        setEmail("");
        setPassword("");
        
        // Switch to login form after successful signup
        setTimeout(() => {
          setIsSignUp(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Sign-up error:", error);
      
      if (error.response) {
        const errorMessages = error.response.data.message || "An error has occurred!";
        setError(errorMessages);
        displayPopup(errorMessages, "error", 3000);
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setError("Connection timeout. Please try again.");
        displayPopup("Connection timeout. Please try again.", "error");
      } else {
        setError("Unable to connect to the server!");
        displayPopup("Unable to connect to the server!", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced login with robust validation
  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setError("");
    setIsSubmitting(true);
    
    try {
      // Validate form
      const validation = validateLoginForm();
      
      if (!validation.isValid) {
        const errorMessage = validation.errors.join(", ");
        setError(errorMessage);
        displayPopup(errorMessage, "error");
        return;
      }
      
      const { sanitizedData } = validation;
      
      console.log("Attempting login with email:", sanitizedData.email);
      
      // Always clear any existing auth state first
      await completeSignOut();
      
      // 1. Authenticate with Firebase
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, sanitizedData.email, sanitizedData.password);
      const firebaseUser = userCredential.user;
      
      // 2. CRITICAL: Check if email is verified in Firebase
      if (!firebaseUser.emailVerified) {
        await completeSignOut(); // Sign out immediately
        setError("Please verify your email before logging in");
        displayPopup(
          "Please verify your email before logging in. Check your inbox for a verification link.", 
          "warning",
          8000
        );
        return;
      }
      
      // 3. Get ID token and check custom claims
      const idToken = await firebaseUser.getIdToken(true);
      const tokenResult = await firebaseUser.getIdTokenResult();
      
      // 4. Role validation
      const userRole = tokenResult.claims.role;
      
      if (!userRole) {
        await completeSignOut();
        setError("Account not properly configured. Please contact support.");
        displayPopup("Account not properly configured. Please contact support.", "error");
        return;
      }
      
      if (userRole !== 'user') {
        await completeSignOut();
        setError("This account is registered as a host. Please use the host login page.");
        displayPopup("This account is registered as a host. Please use the host login page.", "warning", 3000);
        
        setTimeout(() => {
          router.push("/LoginHost");
        }, 3000);
        return;
      }
      
      // 5. Send token to backend for validation
      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        idToken,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000
      });
        
      console.log("Backend login response:", response.data);
        
      if (response && (response.status === 200 || response.status === 201)) {
        // Only save auth data after successful backend validation
        localStorage.setItem('token', idToken);
        localStorage.setItem('authToken', idToken);
        localStorage.setItem('userType', 'user');
        localStorage.setItem('userRole', 'user');
        localStorage.setItem('userEmail', sanitizedData.email);
        
        const userData = response.data.user || response.data || {};
        localStorage.setItem("user", JSON.stringify(userData));
            
        displayPopup("Login successful! Redirecting...", "success", 1000);
        window.dispatchEvent(new Event('userLoggedIn'));
            
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        console.error("Unexpected response status:", response.status);
        await completeSignOut();
        setError("Login failed with unexpected response.");
        displayPopup("Login failed. Please try again.", "error");
      }
    } catch (loginError) {
      console.error('Login error:', loginError);
      
      // Always ensure clean state on any error
      await completeSignOut();
      
      // Handle Firebase Auth errors
      if (loginError.code) {
        let errorMessage = "Authentication failed";
        
        switch (loginError.code) {
          case 'auth/invalid-email':
            errorMessage = "Invalid email format.";
            break;
          case 'auth/user-disabled':
            errorMessage = "This account has been disabled.";
            break;
          case 'auth/user-not-found':
            errorMessage = "User not found.";
            break;
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Invalid email or password.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed login attempts. Please try again later.";
            break;
          default:
            errorMessage = loginError.message || "Authentication failed.";
        }
        
        setError(errorMessage);
        displayPopup(errorMessage, "error");
      } else if (loginError.response) {
        // Backend errors
        const errorMessages = loginError.response.data.message || "Login failed!";
        
        if (loginError.response.status === 401) {
          if (errorMessages.includes("Email not verified") || 
              errorMessages.includes("verify your email")) {
            setError("Please verify your email before logging in");
            displayPopup(
              "Please verify your email before logging in. Check your inbox for a verification link.", 
              "warning",
              8000
            );
          } else {
            setError("Authentication failed. Please check your credentials.");
            displayPopup("Authentication failed. Please check your credentials.", "error");
          }
        } else {
          setError(errorMessages);
          displayPopup(errorMessages, "error");
        }
      } else if (loginError.code === 'ECONNABORTED' || loginError.message.includes('timeout')) {
        setError("Connection timeout. Please try again.");
        displayPopup("Connection timeout. Please try again.", "error");
      } else {
        setError("Unable to connect to the server!");
        displayPopup("Unable to connect to the server!", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await completeSignOut();
  
      const user = await signInWithGoogle();
      if (!user) {
        setError("Google authentication failed");
        displayPopup("Google authentication failed", "error");
        return;
      }

      // Check email verification for Google users too
      if (!user.emailVerified) {
        await completeSignOut();
        setError("Please verify your email before logging in");
        displayPopup(
          "Please verify your email before logging in. Check your inbox for a verification link.", 
          "warning",
          8000
        );
        return;
      }

      const token = await user.getIdToken(true);
      const tokenResult = await user.getIdTokenResult();
      
      // Role validation for Google Sign In
      const userRole = tokenResult.claims.role;
      
      if (!userRole) {
        await completeSignOut();
        setError("Account not properly configured. Please contact support.");
        displayPopup("Account not properly configured. Please contact support.", "error");
        return;
      }
      
      if (userRole !== 'user') {
        await completeSignOut();
        setError("This account is registered as a host. Please use the host login page.");
        displayPopup("This account is registered as a host. Please use the host login page.", "warning", 3000);
        
        setTimeout(() => {
          router.push("/LoginHost");
        }, 3000);
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        idToken: token,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000
      });

      const userData = response.data?.user || response.data;

      if (response.status === 200 || response.status === 201) {
        localStorage.setItem("token", token);
        localStorage.setItem("authToken", token);
        localStorage.setItem("userType", "user");
        localStorage.setItem("userRole", "user");
        localStorage.setItem("userEmail", user.email);
        localStorage.setItem("user", JSON.stringify(userData));
        
        displayPopup("Google login successful! Redirecting...", "success", 1000);
        window.dispatchEvent(new Event('userLoggedIn'));
        
        setTimeout(() => {
          router.push("/");
        }, 1000);
      } else {
        await completeSignOut();
        setError("Authentication failed. Please try again.");
        displayPopup("Authentication failed. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error during Google login:", error);
      await completeSignOut();
      
      if (error.response?.status === 401 && 
          error.response?.data?.message?.includes("Email not verified")) {
        displayPopup(
          "Please verify your email before logging in. Check your inbox for a verification link.", 
          "warning",
          8000
        );
      } else if (error.response?.status === 404) {
        displayPopup("This email is not registered. Please sign up first.", "error");
      } else {
        const errorMessage = error.response?.data?.message || "Google login failed. Please try again.";
        setError(errorMessage);
        displayPopup(errorMessage, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await completeSignOut();
  
      const user = await signInWithGoogle();
      if (!user) {
        setError("No Google user detected");
        displayPopup("Google authentication failed", "error");
        return;
      }
  
      const token = await user.getIdToken(true);
      console.log("Got token from Google, sending to backend...");
  
      const response = await axios.post(`${API_BASE_URL}/users/signup-google`, {
        idToken: token,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000
      });
  
      if (response.data) {
        // Sign out immediately after successful signup
        await completeSignOut();
        
        displayPopup(
          "Google signup successful! Please check your email to verify your account before logging in.", 
          "success", 
          8000
        );
        
        // Switch to login form
        setTimeout(() => {
          setIsSignUp(false);
        }, 2000);
      } else {
        await completeSignOut();
        displayPopup("Signup failed. Please try again.", "error");
      }
  
    } catch (error) {
      console.error("Error during Google signup:", error);
      await completeSignOut();
  
      if (error.response?.status === 409) {
        displayPopup("An account with this email already exists. Please login.", "warning", 3000);
        setTimeout(() => {
          setIsSignUp(false);
        }, 3000);
        return;
      }
      
      const errorMessage = error.response?.data?.message || "Error during Google signup. Please try again.";
      setError(errorMessage);
      displayPopup(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real-time input validation handlers
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error if email becomes valid
    if (error && validateEmail(value.trim())) {
      setError("");
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    
    // Clear error if password becomes valid
    if (error && validatePassword(value)) {
      setError("");
    }
  };

  const handleFullNameChange = (e) => {
    const value = e.target.value;
    setFullName(value);
    
    // Clear error if full name becomes valid
    if (error && validateFullName(value)) {
      setError("");
    }
  };

  return (
    <section className="sign-up-section">
      <div id="sign-up-container" className={`sign-up-container ${isSignUp ? "active" : ""}`}>
        <div className={`form-container sign-in-form ${isSignUp ? "hidden" : ""}`}>
          <form onSubmit={handleSubmitLogin}>
            <h1>Sign in to Your account</h1>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={handleEmailChange}
              disabled={isSubmitting}
              style={{
                borderColor: email && !validateEmail(email.trim()) ? '#ff6b6b' : ''
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={handlePasswordChange}
              disabled={isSubmitting}
              style={{
                borderColor: password && !validatePassword(password) ? '#ff6b6b' : ''
              }}
            />
            <Link href="/forgetPassword">Forgot password?</Link>
            <div id="espace" className="espace">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Log in"}
              </button>
              <span>Or choose this option</span>
            </div>
            <div className="social-icons">
              <a 
                onClick={handleGoogleSignIn} 
                className="icon google-icon" 
                style={{ 
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                <img src="/google.png" alt="Google" />
                <span>Continue with Google</span>
              </a>
            </div>
          </form>
        </div>

        <div className={`form-container sign-up-form ${isSignUp ? "" : "hidden"}`}>
          <form onSubmit={handleSubmitSignup}>
            <h1>Create your account</h1>
            <input
              type="text"
              placeholder="Full name (min. 2 characters)"
              value={fullname}
              onChange={handleFullNameChange}
              disabled={isSubmitting}
              style={{
                borderColor: fullname && !validateFullName(fullname) ? '#ff6b6b' : ''
              }}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={handleEmailChange}
              disabled={isSubmitting}
              style={{
                borderColor: email && !validateEmail(email.trim()) ? '#ff6b6b' : ''
              }}
            />
            <input
              type="password"
              placeholder="Password (min. 8 characters)"
              value={password}
              onChange={handlePasswordChange}
              disabled={isSubmitting}
              style={{
                borderColor: password && !validatePassword(password) ? '#ff6b6b' : ''
              }}
            />
            <div id="espace" className="espace">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Sign up"}
              </button>
              <span>Or choose this option</span>
            </div>
            <div className="social-icons">
              <a 
                onClick={handleGoogleSignUp} 
                className="icon google-icon" 
                style={{ 
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                <img src="/google.png" alt="Google" />
                <span>Continue with Google</span>
              </a>
            </div>
          </form>
        </div>

        <div className="toggle-container">
          <div className="toggle">
            <div className="toggle-panel toggle-left">
              <h1>Good to see you again!</h1>
              <p>Enter your details to ENJOY all the site's features</p>
              <button id="login" onClick={() => setIsSignUp(false)} disabled={isSubmitting}>
                Log in
              </button>
            </div>
            <div className="toggle-panel toggle-right">
              <h1>Hello!</h1>
              <p>Sign up with your details to ENJOY all the site's features</p>
              <button id="register" onClick={() => setIsSignUp(true)} disabled={isSubmitting}>
                Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {showPopup && (
        <Popup
          message={popupMessage}
          type={popupType}
          onClose={() => setShowPopup(false)}
        />
      )}
    </section>
  );
};

export default Login;