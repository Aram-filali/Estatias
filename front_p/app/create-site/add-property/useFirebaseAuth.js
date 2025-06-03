import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

export const useFirebaseAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier s'il y a un ID dans localStorage (pour la persistance après rechargement)
    const savedFirebaseId = localStorage.getItem('firebaseUserId');
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else if (savedFirebaseId) {
        // Si un ID Firebase est stocké localement mais pas d'utilisateur connecté,
        // créer un objet utilisateur minimal avec l'ID
        setUser({ uid: savedFirebaseId });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
};