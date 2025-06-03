"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
//import { initializeFormToggle2 } from "../../src/Login/formToggle2";
import { signInWithGoogle, completeSignOut } from "../../src/firebase";
import Link from "next/link";
import { saveUserProfile } from "../../src/Navbar/profileUtils";
import Popup from "./popup";
import { signInWithEmailAndPassword, getAuth } from 'firebase/auth';
//import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "./firebaseConfig";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(true); // Commencer avec signup visible
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


  useEffect(() => {
    // Initialiser le contrôle de formulaire
    //initializeFormToggle2();
    
    // Commencer avec signup (true), puis basculer vers login (false) après un délai
    // Cela créera l'effet de transition du signup vers le login au chargement
    setTimeout(() => {
      setIsSignUp(false);
    }, 800); // Un délai suffisant pour voir la transition
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
      await completeSignOut(); // Reset session before login
  
      // 🔹 Auth Firebase (ne stocke rien pour l’instant)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
  
      let response;
  
        // Vérification pour les hôtes
        if (email === 'admin1@gmail.com' || email === 'admin2@gmail.com') {
          setPopupMessage("This email is reserved and cannot be used.");
          setPopupType("error");
          setShowPopup(true);
          await completeSignOut(); // Déconnexion en cas d'email réservé
          return;
        }
  
        try {
          // Envoi du token Firebase au backend pour l'authentification des hôtes
          response = await axios.post("http://localhost:3000/hosts/login-host", {
            idToken: token,
          });
  
          // Backend a validé => maintenant on peut stocker
          localStorage.setItem('authToken', token);
          localStorage.setItem('userType', 'host');
          localStorage.setItem('userEmail', email);
  
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
  
          // Ne garde pas l’utilisateur connecté si échec backend
          await completeSignOut();
        }
      }
     catch (err) {
      console.error("Firebase Error:", err);
  
      if (err.code === 'auth/invalid-credential') {
        setPopupMessage("Invalid credentials, please try again.");
      } else {
        setPopupMessage(err.response?.data?.message || "Login error: " + err.message);
      }
  
      setPopupType("error");
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };  
  

/*const handleSubmitLogin = async (e) => {
  e.preventDefault();
    
  if (!email || !password) {
    setError("All fields are required!");
    displayPopup("All fields are required!", "error");
    return;
  }
    
  try {
    await completeSignOut();
    
    // 1. D'abord, authentifiez l'utilisateur avec Firebase
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // 2. Obtenir le token ID de l'utilisateur connecté
    const idToken = await userCredential.user.getIdToken();
    
    // 3. Maintenant, envoyez ce token à votre backend
    const response = await axios.post('http://localhost:3000/users/login', {
      idToken,  // Envoyez uniquement le idToken
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
      
    console.log("Login response:", response);
      
    if (response && response.status === 201) {
      // Sauvegardez le token
      localStorage.setItem('token', idToken);
      
      // Sauvegardez les informations utilisateur
      const userData = response.data || {};
      localStorage.setItem("user", JSON.stringify(userData));
          
      displayPopup("Login successful! Redirecting...", "success", 500);
      window.dispatchEvent(new Event('userLoggedIn'));
          
      setTimeout(() => {
        router.push("/");
      }, 500);
    } else {
      console.log("Response with unexpected status:", response.status);
      setError("Login response received but unexpected status code: " + response.status);
      displayPopup("Login response with unexpected status: " + response.status, "warning");
    }
  } catch (loginError) {
    console.error('There was an error during login!', loginError);
    
    // Gestion spécifique des erreurs Firebase
    if (loginError.code) {
      // Erreurs Firebase Auth
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
          errorMessage = "Invalid password.";
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
      // Erreurs du backend
      const errorMessages = loginError.response.data.message || "Login failed!";
      setError(errorMessages);
      displayPopup(errorMessages, "error");
    } else {
      // Autres erreurs
      setError("Unable to connect to the server!");
      displayPopup("Unable to connect to the server!", "error");
    }
  }
};*/

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
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Link href="/forgetPassword">Forgot password?</Link>
            <div id="espace" className="espace">
              <button type="submit">Log in</button>
              <span>Or choose this option</span>
            </div>
            <div className="social-icons">
              <a  className="icon google-icon" style={{ cursor: "pointer" }}>
                <img src="/google.png" alt="Google" />
                <span>Continue with Google</span>
              </a>
            </div>
          </form>
        </div>

        <div className="toggle-container">
          <div className="toggle">
            <div className="toggle-panel toggle-left">
            </div>
            <div className="toggle-panel toggle-right">
              <h1>Good to see you again!</h1>
              <p>Enter your details to ENJOY all the site's features</p>

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