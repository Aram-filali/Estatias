"use client";
import React, { createContext, useContext, useState } from 'react';

const HostContext = createContext();

export const HostProvider = ({ children }) => {
  const [hostId, setHostId] = useState(null);

  return (
    <HostContext.Provider value={{ hostId, setHostId }}>
      {children}
    </HostContext.Provider>
  );
};

export const useHost = () => useContext(HostContext);
