"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
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
  const [user, setUser] = useState<boolean>(false);
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

  // Function to check if user is authenticated
  const checkUserAuthentication = () => {
    // Use Firebase Auth to check user status
    const currentUser = getAuth().currentUser;
    console.log("Checking authentication, user:", currentUser);
    setUser(!!currentUser); // Set user state based on authentication status
  };

  useEffect(() => {
    // Check authentication on initial load
    checkUserAuthentication();

    // Set up Firebase Auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(true); // If user is authenticated
      } else {
        setUser(false); // If user is not authenticated
      }
    });

    // Add listener for custom 'userLoggedIn' event
    const handleUserLogin = () => {
      checkUserAuthentication();
    };

    const handleUserLogout = () => {
      setUser(false);
    };

    window.addEventListener('userLoggedIn', handleUserLogin);
    window.addEventListener('userLoggedOut', handleUserLogout);
    window.addEventListener('focus', checkUserAuthentication);

    return () => {
      unsubscribe(); // Clean up listener
      window.removeEventListener('userLoggedIn', handleUserLogin);
      window.removeEventListener('userLoggedOut', handleUserLogout);
      window.removeEventListener('focus', checkUserAuthentication);
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

    setUser(false);
    window.dispatchEvent(new Event('userLoggedOut'));

    // Redirect to home or login
    router.push("/");
  } catch (error) {
    console.error("Error during sign out:", error);
  }
};


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
              {!user ? (
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
              ) : null}
            </div>

            {/* Move ProfileDropdown here outside of authButtons */}
            {user && (
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
