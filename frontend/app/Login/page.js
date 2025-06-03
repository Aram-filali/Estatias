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
  const router = useRouter();

  useEffect(() => {

    initializeFormToggle2();
    
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

  const handleSubmitSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    
    if (!fullname || !email || !password) {
      setError("All fields are required!");
      displayPopup("All fields are required!", "error");
      return;
    }
  
    try {
      const response = await axios.post("http://localhost:3000/users/signup", {
        fullname,
        email,
        password,
        role: "user", //on peut le rendre dynamique si necessaire
      });
  
      if (response.data && response.data.access_token) {
        saveUserProfile({ fullname, email, token: response.data.access_token });
        setSuccess(true);
        displayPopup("Sign-up successful! Redirecting...", "success", 500);
        
        setTimeout(() => {
          router.push("/"); 
        }, 500);
      }
    } catch (error) {
      console.error("Sign-up error:", error);
      
      if (error.response) {
        const errorMessages = error.response.data.message || "An error has occurred!";
        setError(errorMessages);
        displayPopup(errorMessages, "error", 2000);
      } else {
        setError("Unable to connect to the server!");
        displayPopup("Unable to connect to the server!", "error");
      }
    }
  };
  

  const handleSubmitLogin = async (e) => {
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
        
        // Vérification spécifique pour le compte non vérifié
        if (loginError.response.status === 401 && 
            (errorMessages.includes("Email not verified") || 
             errorMessages.includes("verify your email"))) {
          setError("Please verify your email before logging in");
          displayPopup(
            "Please verify your email before logging in. Check your inbox for a verification link.", 
            "warning",
            8000 // Afficher plus longtemps pour que l'utilisateur ait le temps de lire
          );
        } else {
          setError(errorMessages);
          displayPopup(errorMessages, "error");
        }
      } else {
        // Autres erreurs
        setError("Unable to connect to the server!");
        displayPopup("Unable to connect to the server!", "error");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await completeSignOut();
  
      const user = await signInWithGoogle();
      if (user) {
        const token = await user.getIdToken();
  
        const response = await axios.post("http://localhost:3000/users/login-google", {
          idToken: token,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        const userData = response.data?.user;
  
        if (userData) {
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(userData));
          
          displayPopup(response.data.message || "Google login successful! Redirecting...", "success", 500);
          window.dispatchEvent(new Event('userLoggedIn'));
          
          setTimeout(() => {
            router.push("/");
          }, 500);
        } else {
          setError("Authentication failed. Please try again.");
          displayPopup("This mail is not registered in the database.", "error");
        }
      }
    } catch (error) {
      console.error("Error during Google login:", error.response ? error.response.data : error.message);
      setError("Error during Google login. Please try again.");
      displayPopup("This mail is not registered in the database.", "error");
    }
  };
  
  const handleGoogleSignUp = async () => {
    try {
      await completeSignOut(); // 🔄 Déconnexion si un user était déjà connecté
  
      const user = await signInWithGoogle();
      if (!user) {
        setError("No Google user detected");
        displayPopup("Google authentication failed", "error");
        return;
      }
  
      const token = await user.getIdToken(true);
      console.log("Got token from Google, sending to backend...");
  
      const response = await axios.post("http://localhost:3000/users/signup-google", {
        idToken: token,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const userData = response.data?.user ?? response.data?.data?.user;
  
      if (userData) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));
  
        displayPopup("Google signup successful! Redirecting...", "success", 500);
        window.dispatchEvent(new Event('userLoggedIn'));
  
        setTimeout(() => {
          router.push("/");
        }, 500);
      } else {
        displayPopup("Signup failed. Please try again.", "error");
      }
  
    } catch (error) {
      console.error("Error during Google signup:", error.response ? error.response.data : error.message);
  
      // ⚠️ Cas : utilisateur déjà existant (Mongo ou Firebase)
      if (error.response?.status === 409) {
        displayPopup("An account with this email already exists. Please login.", "warning", 2000);
        setTimeout(() => {
          // tu peux rediriger vers login si tu veux :
          // router.push("/login");
        }, 2000);
        return;
      }
      const errorMessage = error.response?.data?.message || "Error during Google signup. Please try again.";
      setError(errorMessage);
      displayPopup(errorMessage, "error");
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
              <a onClick={handleGoogleSignIn} className="icon google-icon" style={{ cursor: "pointer" }}>
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
              placeholder="Full name"
              value={fullname}
              onChange={(e) => setFullName(e.target.value)}
            />
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
            <div id="espace" className="espace">
              <button type="submit">Sign up</button>
              <span>Or choose this option</span>
            </div>
            <div className="social-icons">
              <a onClick={handleGoogleSignUp} className="icon google-icon" style={{ cursor: "pointer" }}>
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
              <button id="login" onClick={() => setIsSignUp(false)}>Log in</button>
            </div>
            <div className="toggle-panel toggle-right">
              <h1>Hello!</h1>
              <p>Sign up with your details to ENJOY all the site's features</p>
              <button id="register" onClick={() => setIsSignUp(true)}>Sign up</button>
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