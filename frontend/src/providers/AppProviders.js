"use client"; // Ensure it runs on the client side

import React from "react";
import { Provider } from "react-redux";
import Store from "../redux/store"; // Adjusted import
import { AuthProvider } from "../context/AuthContext"; // Auth context provider
//import { HostProvider } from "../src/Login/HostProvider"; // Provider from layout.js


export default function AppProviders({ children }) {
  return (
    
        <Provider store={Store}>
        <AuthProvider>

                
                    {children}
                

        </AuthProvider>
        </Provider>
        
  );
}
