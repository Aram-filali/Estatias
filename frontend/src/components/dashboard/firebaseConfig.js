"use client";
import { initializeApp } from "firebase/app";
import { getAuth, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Fonction de connexion avec Google
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Erreur Google Auth :", error);
    throw error; // Assurez-vous de lancer l'erreur si nécessaire
  }
};

// Fonction pour la déconnexion complète
export const completeSignOut = async () => {
  try {
    // Effacer le stockage local
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Déconnecter l'utilisateur de Firebase
    await signOut(auth);

    // Déclencher l'événement de déconnexion
    window.dispatchEvent(new Event("userLoggedOut"));

    console.log("Utilisateur complètement déconnecté");
    return true;
  } catch (error) {
    console.error("Erreur lors de la déconnexion :", error);
    return false;
  }
};

export { auth };  // Export de Firebase Auth pour utilisation ailleurs
