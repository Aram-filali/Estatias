"use client"; 
import { useEffect, useState } from "react";
import Link from "next/link"; 
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext'; 
import ProfileDropdown from "./ProfileDropDown";
import styles from "./Navbar.module.css";

export const Navbar = () => {
  const { user, isAuthenticated, loading } = useAuth(); 
  const router = useRouter();
  const pathname = usePathname();
  const [isFixed, setIsFixed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [arrowRotated, setArrowRotated] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isHome = pathname === '/';
      
      if (window.scrollY > 100) {
        setIsFixed(true);
        document.body.classList.add('scrolled');
        if (isHome) {
          document.body.classList.remove('home');
        }
      } else {
        setIsFixed(false);
        document.body.classList.remove('scrolled');
        if (isHome) {
          document.body.classList.add('home');
        }
      }
    };

    // Initial setup
    const isHome = pathname === '/';
    if (isHome) {
      document.body.classList.add('home');
    }

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.classList.remove('home');
      document.body.classList.remove('scrolled');
    };
  }, [pathname]);

  // Logout function - now uses the completeSignOut from firebase.js
  const handleLogout = async () => {
    try {
      const { completeSignOut } = await import('../firebase'); 
      const success = await completeSignOut();
      if (success) {
        router.push("/");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Function to handle guest button click
  const handleGuestButtonClick = () => {
    setIsOpen(!isOpen);
    setArrowRotated(!arrowRotated);
  };

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className={`${styles.main} ${isFixed ? styles.scrolled : ''}`}>
        <div className={styles.fixed}>
          <div className={styles.navbarContent}>
            <div className={styles.brandSection}>
              <Link href="/" className={styles.brandLink}>
                <h1 className={styles.brandName}>Host Website</h1>
              </Link>
            </div>
            <div className={styles.navLinks}>
              <ul className={styles.navList}>
                <li className={styles.navItem}>
                  <Link href="/" className={styles.loginBtn}>
                    Home
                  </Link>
                </li>
                {/* Show loading or placeholder */}
                <li className={styles.authButtons}>
                  <span className={styles.loginBtn}>Loading...</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.main} ${isFixed ? styles.scrolled : ''}`}>
      <div className={styles.fixed}>
        <div className={styles.navbarContent}>
          {/* Brand/Logo Section */}
          <div className={styles.brandSection}>
            <Link href="/" className={styles.brandLink}>
              <h1 className={styles.brandName}>Host Website</h1>
            </Link>
          </div>

          {/* Navigation Links Section */}
          <div className={styles.navLinks}>
            <ul className={styles.navList}>
              <li className={styles.navItem}>
                <Link href="/" className={styles.loginBtn}>
                  Home
                </Link>
              </li>
                
              {/* Show Host link only when user is NOT authenticated and not on auth pages */}
              {!isAuthenticated && pathname !== "/signUp" && pathname !== "/Login" && pathname !== "/LoginHost" && (
                <li className={styles.authButtons}>
                  <Link href="/LoginHost" className={styles.loginBtn}>
                    As a Host
                  </Link>
                </li>
              )}

              {/* Show Guest dropdown only when user is NOT authenticated and not on Login/SignUp pages */}
              {!isAuthenticated && pathname !== "/Login" && pathname !== "/signUp" && (
                <li className={`${styles.authButtons}`}>
                  <button 
                    className={styles.loginBtn}
                    onClick={handleGuestButtonClick}
                  >
                    <span>As a Guest</span>
                    <span className={`${styles.dropdownArrow} ${arrowRotated ? styles.rotate : ''}`}>▾</span>
                  </button>
                  
                  {/* Show dropdown menu based on isOpen */}
                  {isOpen && (
                    <ul className={styles.dropdownMenu}>
                      <li>
                        <Link href="/Login" onClick={() => {
                          setIsOpen(false);
                          setArrowRotated(false);
                        }}>Login</Link>
                      </li>
                      <li>
                        <Link href="/signUp" onClick={() => {
                          setIsOpen(false);
                          setArrowRotated(false);
                        }}>Create Account</Link>
                      </li>
                    </ul>
                  )}
                </li>
              )}
    
              {/* Show ProfileDropdown ONLY when user is authenticated */}
              {isAuthenticated && user && !loading && (
                <li className={styles.userProfile}>
                  <ProfileDropdown onLogout={handleLogout} />
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};