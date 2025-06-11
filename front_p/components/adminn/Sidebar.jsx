'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart, List, Users, Home, Bell } from 'lucide-react';
import styles from './Sidebar.module.css';
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, completeSignOut } from "@/contexts/firebaseConfig";


export default function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/adminn', icon: Home },
    { name: 'Analytics', href: '/adminn/analytics', icon: BarChart },
    { name: 'Listings', href: '/adminn/listings', icon: List },
    { name: 'Hosts', href: '/adminn/hosts', icon: Users },
    { name: 'Notifications', href: '/adminn/notifications', icon: Bell },
  ];

  const handleLogout = async () => {
    try {
      await completeSignOut(); // Handles Firebase signOut + other cleanup
      localStorage.removeItem("userRole");
      localStorage.removeItem("userType");
      localStorage.clear(); // Optional: if you want to fully wipe localStorage
  
      window.dispatchEvent(new Event('userLoggedOut'));
  
      // Redirect to home or login
      router.push("/");
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  return (
    <div className={styles.sidebarContainer}>
      <div className={styles.sidebarHeader}>
        <span> Hello Admin !</span>
      </div>
      <nav className={styles.sidebarNav}>
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ''}`}
            >
              <item.icon
                className={`${styles.sidebarIcon} ${isActive ? styles.sidebarIconActive : ''}`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className={styles.sidebarFooter}>
        <div className="flex-shrink-0">
          <div className={styles.sidebarAvatar}>
            {/* Get the first letter of the name and render it as an avatar */}
            <span className="text-white font-bold text-lg">
              {`Admin 1`.charAt(0)}
            </span>
          </div>
        </div>
        <div className={styles.sidebarUserInfo}>
          <p className={styles.sidebarUserName}>services team member</p>
          <p className={styles.sidebarUserEmail}>estatias.services@mail.com</p>
        </div>

        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </div>
    </div>
  );
}
