"use client";

import { useState } from "react";
import styles from "./login.module.css";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, completeSignOut } from "@/contexts/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext"; 
import axios from "axios";
import { useRouter } from "next/navigation";
import Popup from "./popup";
import Link from 'next/link';

export default function LoginForm() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");

  const router = useRouter();
  const { userRole } = useAuth();

  // Helper function to wait for role to be set and then redirect
  const waitForRoleAndRedirect = async (expectedRole = null) => {
    const maxAttempts = 50; // 5 seconds max wait
    let attempts = 0;
    
    const checkRole = () => {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          attempts++;
          
          // Get role from localStorage as fallback
          const storedRole = localStorage.getItem('userRole') || localStorage.getItem('userType');
          
          if (storedRole || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            resolve(storedRole);
          }
        }, 100); // Check every 100ms
      });
    };
    
    const role = await checkRole();
    
    if (role) {
      redirectBasedOnRole(role);
    } else {
      console.warn('Role not found after waiting, redirecting to home');
      router.push("/");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email === 'admin1@gmail.com' || user.email === 'admin2@gmail.com' || user.email === 'estatias.services@gmail.com') {
        setPopupMessage("This email is reserved and cannot be used.");
        setPopupType("error");
        setShowPopup(true);
        await completeSignOut();
        return;
      }

      if (!user.emailVerified) {
        setPopupMessage("Your email is not verified. Please check your inbox.");
        setPopupType("error");
        setShowPopup(true);
        await completeSignOut();
        return;
      }

      const token = await user.getIdToken();
      console.log("Retrieved token: ", token);

      /*const userProfile = {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      };
      console.log("User profile: ", userProfile);*/

      try {
        const res = await axios.post("http://localhost:3000/hosts/google-host", { idToken: token });
        console.log("Response from google-host:", res.data);

        setPopupMessage("Successfully signed in with Google!");
        setPopupType("success");
        setShowPopup(true);
        
        // Wait for Firebase auth context to update with custom claims
        setTimeout(async () => {
          await waitForRoleAndRedirect('host');
        }, 1500);
        
      } catch (apiError) {
        console.error("API error:", apiError.response?.data || apiError);
        setPopupMessage(apiError.response?.data?.message || "Error connecting to the server");
        setPopupType("error");
        setShowPopup(true);
        await completeSignOut();
      }
    } catch (err) {
      console.error("Google login error:", err);
      setPopupMessage("Google login failed.");
      setPopupType("error");
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
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
      await completeSignOut(); // Reset session before login
  
      // 🔹 Auth Firebase (ne stocke rien pour l’instant)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
  
       if (isAdmin) {
        try {
          // Send token to admin backend endpoint
          const response = await axios.post("http://localhost:3000/admins/login", { 
            idToken: token 
          });
          
          console.log("Admin login response:", response.data);
          
          setPopupMessage("Admin login successful!");
          setPopupType("success");
          setShowPopup(true);
          
          // Wait for role to be set, then redirect
          setTimeout(async () => {
            await waitForRoleAndRedirect('admin');
          }, 1500);
          
        } catch (apiError) {
          console.error("Admin API error:", apiError.response?.data || apiError);
          setPopupMessage(apiError.response?.data?.message || "Admin authentication failed");
          setPopupType("error");
          setShowPopup(true);
          await completeSignOut();
        }
  
      } else {
        // Vérification pour les hôtes
        if (email === 'admin1@gmail.com' || email === 'admin2@gmail.com' || user.email === 'estatias.services@gmail.com') {
          setPopupMessage("This email is reserved and cannot be used.");
          setPopupType("error");
          setShowPopup(true);
          await completeSignOut(); // Déconnexion en cas d'email réservé
          return;
        }
  
        try {
          // Envoi du token Firebase au backend pour l'authentification des hôtes
          const response = await axios.post("http://localhost:3000/hosts/login-host", {
            idToken: token,
          });
  
          console.log("Host login response:", response.data);
  
          setPopupMessage("Host login successful!");
          setPopupType("success");
          setShowPopup(true);
  
          // Wait for role to be set, then redirect
          setTimeout(async () => {
            await waitForRoleAndRedirect('host');
          }, 1500);
  
        } catch (apiError) {
          console.error("API login error:", apiError.response?.data || apiError);
          setPopupMessage(apiError.response?.data?.message || "Server connection error");
          setPopupType("error");
          setShowPopup(true);
  
          // Ne garde pas l’utilisateur connecté si échec backend
          await completeSignOut();
        }
      }
    } catch (err) {
      console.error("Firebase Error:", err);
  
      if (err.code === 'auth/invalid-credential') {
        setPopupMessage("Invalid credentials, please try again.");
      } else if (err.code === 'auth/user-not-found') {
        setPopupMessage("No account found with this email address.");
      } else if (err.code === 'auth/wrong-password') {
        setPopupMessage("Incorrect password.");
      } else if (err.code === 'auth/too-many-requests') {
        setPopupMessage("Too many failed attempts. Please try again later.");
      } else {
        setPopupMessage("Login error: " + err.message);
      }
  
      setPopupType("error");
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };  
  

  // Helper function to redirect based on role (for Google login)
  const redirectBasedOnRole = (role) => {
    switch (role) {
      case 'admin':
        router.push("/adminn");
        break;
      case 'host':
        router.push("/dashboard");
        break;
      default:
        console.warn('Unknown role:', role, 'redirecting to home');
        router.push("/"); // fallback
    }
  };

  const handleToggleLogin = () => setIsAdmin(!isAdmin);

  return (
    <div className={styles.container}>
      <div className="fixed top-0 left-0 w-full h-full">
        <div className="w-full h-full bg-[url('/bg-city.jpg')] bg-cover bg-center filter blur-sm"></div>
      </div>

      <div className={styles.loginWrapper}>
        <h2 className={styles.loginTitle}>
          {isAdmin ? "Admin Login" : "Host Login"}
        </h2>

        <div className={styles.formContainer}>
          <form className={styles.loginForm} onSubmit={handleLogin}>
            <input
              type="email"
              placeholder={isAdmin ? "Admin Email" : "Host Email"}
              className={styles.inputField}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className={styles.inputField}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit" className={styles.loginButton} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {!isAdmin && (
            <button className={styles.googleLoginButton} onClick={handleGoogleLogin} disabled={loading}>
              {loading ? "Processing..." : "Login with Google"}
            </button>
          )}
        </div>

        <div className={styles.buttonContainer}>
          <button onClick={handleToggleLogin} className={styles.switchLoginButton} disabled={loading}>
            <span className={styles.text}>
              {isAdmin ? "Login as Host" : "Login as Admin"}
            </span>
          </button>
          
          {/* Afficher "Forgot Password?" uniquement si ce n'est pas le formulaire admin */}
          {!isAdmin && (
            <>
              <span className={styles.separator}>|</span>
              <button className={styles.switchLoginButton} disabled={loading}>
                <Link href="/forgetPassword" className={styles.text}>Forgot Password?</Link>
              </button>
            </>
          )}
        </div>
      </div>

      {showPopup && (
        <Popup
          message={popupMessage}
          type={popupType}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}