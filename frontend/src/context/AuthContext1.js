import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from '../firebase';

// Créer le contexte d'authentification
const AuthContext = createContext();

// Hook personnalisé pour utiliser le contexte d'authentification
export function useAuth() {
  return useContext(AuthContext);
}

// Provider du contexte d'authentification
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour s'inscrire avec email et mot de passe
  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  // Fonction pour se connecter avec email et mot de passe
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Fonction pour se déconnecter
  function signOut() {
    return firebaseSignOut(auth);
  }

  // Écouter les changements d'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Valeurs à partager via le contexte
  const value = {
    currentUser,
    login,
    signup,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}