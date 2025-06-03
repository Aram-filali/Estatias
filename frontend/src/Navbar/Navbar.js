"use client"; 
import { useEffect, useState } from "react";
import Link from "next/link"; 
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, signOut } from "firebase/auth";
import ProfileDropdown from "./ProfileDropDown";
import styles from "./Navbar.module.css";

export const Navbar = () => {
  const [user, setUser] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [isFixed, setIsFixed] = useState(false);

  // Function to check if user is authenticated
  const checkUserAuthentication = () => {
    const isAuthenticated = !!localStorage.getItem('token') || !!localStorage.getItem('jwt');
    setUser(isAuthenticated);
  };

  const [isOpen, setIsOpen] = useState(false);
  // Nouvel état pour suivre la rotation de la flèche
  const [arrowRotated, setArrowRotated] = useState(false);

  useEffect(() => {
    // Check authentication on initial load
    checkUserAuthentication();

    // Add listener for custom 'userLoggedIn' event
    const handleUserLogin = () => {
      checkUserAuthentication();
    };

    window.addEventListener('userLoggedIn', handleUserLogin);
    window.addEventListener('focus', checkUserAuthentication);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLogin);
      window.removeEventListener('focus', checkUserAuthentication);
    };
  }, []);

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

  // Logout function
  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth).then(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      setUser(false);
      router.push("/");
    }).catch((error) => {
      console.error("Error during sign out:", error);
    });
  };

  // Fonction pour gérer le clic sur le bouton As a Guest
  const handleGuestButtonClick = () => {
    setIsOpen(!isOpen);
    setArrowRotated(!arrowRotated); // Basculer l'état de rotation à chaque clic
  };

  /*const shouldHideNav = ["/login"].includes(pathname);

  if (shouldHideNav) {
    return null;
  }*/

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
                
              
              {!user && pathname !== "/signUp" && pathname !== "/Login" && pathname !== "/LoginHost" && (
                  <li className={styles.authButtons}>
                    <Link href="/LoginHost" className={styles.loginBtn}>
                      As a Host
                    </Link>
                  </li>
                )}

                {!user && pathname !== "/Login" && pathname !== "/signUp" && (
                  <li 
                    className={`${styles.authButtons}`} 
                  >
                    <button 
                      className={styles.loginBtn}
                      onClick={handleGuestButtonClick} // Utiliser notre nouvelle fonction
                    >
                      <span>As a Guest</span>
                      <span className={`${styles.dropdownArrow} ${arrowRotated ? styles.rotate : ''}`}>▾</span>
                    </button>
                    
                    {/* Afficher le menu déroulant basé sur isOpen */}
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
    
              
              {user && (
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