"use client";

import React, { createContext, useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase'; // Firebase import

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe(); // Cleanup listener
  }, []);

  const authContextValue = useMemo(() => ({ user, setUser }), [user]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
