'use client';

import { useState } from 'react';
import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FaHome, FaChartLine, FaCreditCard, FaBell, FaCog, FaSignOutAlt, FaBars } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import styles from './Dashboard.module.css';
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, completeSignOut } from "@/contexts/firebaseConfig";
import _ProtectedRoute from 'components/ProtectedRoute';

const ProtectedRoute = _ProtectedRoute as React.FC<{
  allowedRoles?: string[];
  redirectTo?: string;
  children: ReactNode;
}>;
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = 2; // Placeholder, ideally fetched or passed as prop
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  
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


  // Helper function to determine active link
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };
  
  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setSidebarExpanded(false);
  };

  return (
    <ProtectedRoute allowedRoles={['host']}>
    <div className={styles.dashboardContainer}>
      {/* Collapsed mini sidebar - only visible when expanded is false */}
      {!sidebarExpanded && (
        <aside className={styles.collapsedSidebar}>
          <button 
            className={styles.sidebarToggle}
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <FaBars />
          </button>
          
          <nav className={styles.collapsedNavigation}>
            <button 
              className={`${styles.iconButton} ${isActive('/dashboard') ? styles.activeIcon : ''}`}
              onClick={() => handleNavigation('/dashboard')}
              aria-label="Dashboard"
            >
              <FaHome />
            </button>
            <button 
              className={`${styles.iconButton} ${isActive('/dashboard/analytics') ? styles.activeIcon : ''}`}
              onClick={() => handleNavigation('/dashboard/analytics')}
              aria-label="Analytics"
            >
              <FaChartLine />
            </button>
            <button 
              className={`${styles.iconButton} ${isActive('/dashboard/subscription') ? styles.activeIcon : ''}`}
              onClick={() => handleNavigation('/dashboard/subscription')}
              aria-label="Subscription"
            >
              <FaCreditCard />
            </button>
            {/*<button 
              className={`${styles.iconButton} ${isActive('/dashboard/notifications') ? styles.activeIcon : ''}`}
              onClick={() => handleNavigation('/dashboard/notifications')}
              aria-label="Notifications"
            >
              <FaBell />
              {unreadCount > 0 && <span className={styles.miniNotificationBadge}>{unreadCount}</span>}
            </button>*/}
            <button 
              className={`${styles.iconButton} ${isActive('/dashboard/settings') ? styles.activeIcon : ''}`}
              onClick={() => handleNavigation('/dashboard/settings')}
              aria-label="Settings"
            >
              <FaCog />
            </button>
          </nav>
          
          <button 
            className={`${styles.iconButton} ${styles.logoutIconButton}`}
            onClick={handleLogout}
            aria-label="Logout"
          >
            <FaSignOutAlt />
          </button>
        </aside>
      )}
      
      {/* Expanded sidebar - visible when expanded */}
      {sidebarExpanded && (
        <>
          <div className={styles.overlay} onClick={toggleSidebar}></div>
          <aside className={styles.expandedSidebar}>
            <div className={styles.expandedHeader}>
              <div className={styles.brandLogo}>
                <span>HostHub</span>
              </div>
              <button className={styles.closeButton} onClick={toggleSidebar} aria-label="Close sidebar">
                <IoMdClose />
              </button>
            </div>
            
            <nav className={styles.navigation}>
              <Link
                href="/dashboard"
                className={isActive('/dashboard') ? styles.active : ''}
                onClick={() => setSidebarExpanded(false)}
              >
                <FaHome /> Dashboard
              </Link>
              <Link
                href="/dashboard/analytics"
                className={isActive('/dashboard/analytics') ? styles.active : ''}
                onClick={() => setSidebarExpanded(false)}
              >
                <FaChartLine /> Analytics
              </Link>
              <Link
                href="/dashboard/subscription"
                className={isActive('/dashboard/subscription') ? styles.active : ''}
                onClick={() => setSidebarExpanded(false)}
              >
                <FaCreditCard /> Subscription
              </Link>
              <Link
                href="/dashboard/notifications"
                className={isActive('/dashboard/notifications') ? styles.active : ''}
                onClick={() => setSidebarExpanded(false)}
              >
                <FaBell /> Notifications
                {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
              </Link>
              <Link
                href="/dashboard/settings"
                className={isActive('/dashboard/settings') ? styles.active : ''}
                onClick={() => setSidebarExpanded(false)}
              >
                <FaCog /> Settings
              </Link>
            </nav>
            
            <div className={styles.logoutButton}
            onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </div>
          </aside>
        </>
      )}
      
      <main className={styles.mainContent} style={{ marginLeft: sidebarExpanded ? '0' : '60px' }}>
        {children}
      </main>
    </div>
    </ProtectedRoute>
  );
}