// firebase.js
'use client';

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Récupération de la configuration depuis les variables d'environnement
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Helper function to delete cookies
const deleteCookie = (name) => {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }
};

// Fonction de connexion avec Google
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Erreur Google Auth :", error);
    throw error;
  }
};

// Fonction de déconnexion complète
export const completeSignOut = async () => {
  try {
    // Clear localStorage (both old and new keys)
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userType");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("userRole");

    // Clear cookies
    deleteCookie('authToken');
    deleteCookie('userRole');
    deleteCookie('userEmail');

    // Sign out from Firebase
    await signOut(auth);

    // Dispatch logout event
    window.dispatchEvent(new Event("userLoggedOut"));

    console.log("Utilisateur complètement déconnecté");
    return true;
  } catch (error) {
    console.error("Erreur lors de la déconnexion :", error);
    return false;
  }
};

export { auth };