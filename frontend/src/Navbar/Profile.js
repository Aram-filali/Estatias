/*"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router'; // Remplacer useNavigate par useRouter de Next.js
import { jwtDecode } from 'jwt-decode'; // Assure-toi que jwt-decode est bien installé
import styles from './Profile.module.css';
import { Logout } from 'app/login/page'; // Vérifie que le composant Logout est exporté correctement
import ProfileDropdown from './ProfileDropDown';

export const Profile = () => {
    const [user, setUser] = useState(null);
    const [isLogoutVisible, setIsLogoutVisible] = useState(false);
    const router = useRouter(); // Utilisation de useRouter

    useEffect(() => {
        const token = localStorage.getItem("jwt") || localStorage.getItem("token");

        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser(decoded);
                console.log(decoded); // Retirer cette ligne en production
            } catch (error) {
                console.error('Token decoding failed:', error);
                setUser(null);
            }
        } else {
            setUser(null);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("jwt");
        localStorage.removeItem("token");
        router.push('/login'); // Redirige vers la page de connexion après déconnexion
    };

    return (
        <div>
            <div className={styles.profile} onClick={() => setIsLogoutVisible(!isLogoutVisible)}>
                <div>
                    <h4 style={{ marginTop: '20px', marginRight: '20px' }}>
                        {user ? user.username || user.email : 'User'}
                    </h4> {/* Afficher "User" si l'utilisateur est nul *//*}
                </div>
                <div>
                    {isLogoutVisible && <ProfileDropdown onLogout={handleLogout} />}
                </div>
            </div>
        </div>
    );
};*/
import { useEffect, useState } from "react";
import { getUserProfile, clearUserProfile } from "@/utils/profileUtils";
import { useRouter } from "next/router";
import styles from "./Profile.module.css";
import ProfileDropdown from "./ProfileDropDown";

export const Profile = () => {
  const [user, setUser] = useState(null);
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUser(getUserProfile());
  }, []);

  const handleLogout = () => {
    clearUserProfile();
    router.push("/login");
  };

  return (
    <div>
      <div className={styles.profile} onClick={() => setIsLogoutVisible(!isLogoutVisible)}>
        <h4 style={{ marginTop: "20px", marginRight: "20px" }}>
          {user ? user.fullname || user.email : "User"}
        </h4>
        {isLogoutVisible && <ProfileDropdown onLogout={handleLogout} />}
      </div>
    </div>
  );
};

