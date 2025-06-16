//navbar of front_p
"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuth, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, completeSignOut } from "@/contexts/firebaseConfig";
import Link from "next/link";
import Image from "next/image";
import styles from "./Navbar.module.css";
import styled from "styled-components";
import ProfileDropdown from "./ProfileDropDown";
import LanguageDropdown from "./LanguageDropdown";
import { ExploreDropdown } from "./exploreDropdown";

// Define types for TabsProps
interface TabsProps {
  t: number;
  tab: number;
  onClick: () => void;
}

const Tabs = styled.li<TabsProps>`
  cursor: pointer;
  padding-left: 8px;
  padding-right: 12px;
  text-align: center;
  padding-bottom: 10px;
  border-bottom: ${(props) => (props.tab === props.t ? "2px solid white" : "none")};
  font-weight: ${(props) => (props.tab === props.t ? "500" : "normal")};
  font-size: ${(props) => (props.tab === props.t ? "14px" : "13px")};
  color: inherit;
`;

interface NavbarProps {}

export const Navbar: React.FC<NavbarProps> = () => {
  const [tab, setTabs] = useState<number>(1);
  const [user, setUser] = useState<User | null>(null); // Changed to store actual user object
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true); // Track loading state
  const [isFixed, setIsFixed] = useState<boolean>(false);
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const navbarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const showColPages = pathname === "/" || pathname === "/contact" || pathname === "/unauthorized"||
  pathname.startsWith("/adminn");

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50 && !isFixed) {
        setIsFixed(true);
      } else if (window.scrollY <= 50 && isFixed) {
        setIsFixed(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isFixed]);

  useEffect(() => {
    // Set up Firebase Auth state listener - this is the main authentication check
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser);
      setUser(currentUser); // Set the actual user object or null
      setIsAuthLoading(false); // Authentication state has been determined
    });

    // Add listener for custom events (optional, for additional triggers)
    const handleUserLogin = () => {
      // The onAuthStateChanged will handle this automatically
      console.log("Custom userLoggedIn event triggered");
    };

    const handleUserLogout = () => {
      // The onAuthStateChanged will handle this automatically
      console.log("Custom userLoggedOut event triggered");
    };

    window.addEventListener('userLoggedIn', handleUserLogin);
    window.addEventListener('userLoggedOut', handleUserLogout);

    return () => {
      unsubscribe(); // Clean up listener
      window.removeEventListener('userLoggedIn', handleUserLogin);
      window.removeEventListener('userLoggedOut', handleUserLogout);
    };
  }, []);

  // Pages where navbar should have special hover behavior
  const specialPages = ["/create-site/signup", "/addProperty"];

  // Check if current page requires special navbar behavior
  useEffect(() => {
    // For special pages, start hidden
    // For normal pages, always visible
    setIsHidden(specialPages.includes(pathname));
  }, [pathname]);

  useEffect(() => {
    // Only add hover behavior for special pages
    if (!specialPages.includes(pathname)) return;

    const handleMouseMove = (e: MouseEvent) => {
      // For special pages, toggle visibility based on mouse position
      setIsHidden(e.clientY > 100);
    };

    // Add event listener to entire window
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await completeSignOut(); // Handles Firebase signOut + other cleanup
      localStorage.removeItem("userRole");
      localStorage.removeItem("userType");
      localStorage.clear(); // Optional: if you want to fully wipe localStorage

      // Note: setUser will be handled automatically by onAuthStateChanged
      window.dispatchEvent(new Event('userLoggedOut'));

      // Redirect to home or login
      router.push("/");
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  // Helper function to check if user is authenticated
  const isAuthenticated = user !== null;

  return (
    <div
      ref={navbarRef}
      className={`${styles.main} ${styles.navbarContainer}
        ${isFixed ? styles.fixed : ''}
        ${showColPages ? styles.homePage : ''}
        ${isHidden ? styles.hidden : styles.visible}`}
    >
      {/* 🔹 Top section of the navbar */}
      <div className={styles.navbarUpperSection}>
        {/* 🔹 Logo */}
        <div className={styles.logo}>
          <Link href="/">
            <Image src="/Estatias.png" alt="Logo" width={155} height={100} priority />
          </Link>
        </div>

        {/* 🔹 Navbar items */}
        <div className={styles.navbarUpperSectionItems}>
          <div className={styles.Buttons}>
            <ExploreDropdown />
            <div className={styles.authButtons}>
              {/* Show auth buttons only when user is NOT authenticated and not loading */}
              {!isAuthenticated && !isAuthLoading && (
                <>
                  {pathname !== "/create-site/signup" && pathname !== "/getStarted" && (
                    <Link href="/getStarted">
                      <button className={styles.authButton}>Get Started</button>
                    </Link>
                  )}
                  {pathname !== "/login" && pathname !=="/forgetPassword" && pathname !=="/reset-password" && (
                    <Link href="/login">
                      <button className={styles.authButton}>Login</button>
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* ProfileDropdown - only show when user IS authenticated */}
            {isAuthenticated && (
              <div className={styles.userProfile}>
                <ProfileDropdown onLogout={handleLogout} />
              </div>
            )}
            
            <div className={styles.langButton}>
              <LanguageDropdown />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};