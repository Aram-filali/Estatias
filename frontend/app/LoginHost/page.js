// Updated LoginHostt.js (Host Login)
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { signInWithGoogle, completeSignOut } from "../../src/firebase";
import Link from "next/link";
import { saveUserProfile } from "../../src/Navbar/profileUtils";
import Popup from "./popup";
import { signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import { auth } from "./firebaseConfig";

const LoginHostt = () => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("error");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';


  useEffect(() => {
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

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
  
    if (!email || !password) {
      setPopupMessage("Please fill in all fields.");
      setPopupType("error");
      setShowPopup(true);
      return;
    }
  
    try {
      setLoading(true);
      setError(null);
      await completeSignOut();
  
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken(true);
      const tokenResult = await user.getIdTokenResult();
      
      // **ROLE VALIDATION** - Check if user has 'host' role
      const userRole = tokenResult.claims.role;
      
      if (!userRole) {
        await completeSignOut();
        setPopupMessage("Account not properly configured. Please contact support.");
        setPopupType("error");
        setShowPopup(true);
        return;
      }
      
      if (userRole !== 'host') {
        // If user has 'user' role, redirect them to user login
        await completeSignOut();
        setPopupMessage("This account is registered as a user. Please use the user login page.");
        setPopupType("warning");
        setShowPopup(true);
        
        // Optional: Auto-redirect to user login after delay
        setTimeout(() => {
          router.push("/Login");
        }, 3000);
        return;
      }
  
      // Reserved email check (if still needed)
      if (email === 'admin1@gmail.com' || email === 'admin2@gmail.com') {
        setPopupMessage("This email is reserved and cannot be used.");
        setPopupType("error");
        setShowPopup(true);
        await completeSignOut();
        return;
      }
  
      try {
        // Send token to backend for host authentication (only if role is 'host')
        const response = await axios.post(`${API_BASE_URL}/hosts/login-host`, {
          idToken: token,
        });
  
        // Backend validated => store user data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userType', 'host');
        localStorage.setItem('userRole', 'host');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('token', token); // Keep compatibility
  
        setPopupMessage("Host login successful!");
        setPopupType("success");
        setShowPopup(true);
  
        window.dispatchEvent(new Event('userLoggedIn'));
        router.push("/MyWebsite");
  
      } catch (apiError) {
        console.error("API login error:", apiError.response?.data || apiError);
        setPopupMessage(apiError.response?.data?.message || "Server connection error");
        setPopupType("error");
        setShowPopup(true);
  
        // Don't keep user logged in if backend fails
        await completeSignOut();
      }
    } catch (err) {
      console.error("Firebase Error:", err);
  
      let errorMessage = "Login error";
      
      if (err.code) {
        switch (err.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
            errorMessage = "Invalid credentials, please try again.";
            break;
          case 'auth/user-not-found':
            errorMessage = "No account found with this email.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email format.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          default:
            errorMessage = err.message || "Authentication failed.";
        }
      } else {
        errorMessage = err.response?.data?.message || err.message || "Login error";
      }
  
      setPopupMessage(errorMessage);
      setPopupType("error");
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="sign-up-section">
      <div id="sign-up-container" className={`sign-up-container ${isSignUp ? "active" : ""}`}>
        <div className={`form-container sign-in-form ${isSignUp ? "hidden" : ""}`}>
          <form onSubmit={handleSubmitLogin}>
            <h1>Host Sign in</h1>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Link href="/forgetPassword">Forgot password?</Link>
            <div id="espace" className="espace">
              <button type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Log in"}
              </button>
              <span>Host Login Only</span>
            </div>
            <div className="social-icons">
              <a className="icon google-icon" style={{ cursor: "not-allowed", opacity: 0.5 }}>
                <img src="/google.png" alt="Google" />
                <span>Google login disabled for hosts</span>
              </a>
            </div>
          </form>
        </div>

        <div className="toggle-container">
          <div className="toggle">
            <div className="toggle-panel toggle-left">
            </div>
            <div className="toggle-panel toggle-right">
              <h1>Welcome Back, Host!</h1>
              <p>Enter your host credentials to access your dashboard</p>
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

export default LoginHostt;