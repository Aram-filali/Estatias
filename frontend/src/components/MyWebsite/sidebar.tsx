'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faUserCircle, faBuilding, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import styles from './sidebar.module.css';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className={styles.sidebar}>
      
      <div
        className={`${styles.sidebarItem} ${isActive('/MyWebsite') ? styles.active : ''}`}
        onClick={() => router.push('/MyWebsite')}
      >
        <FontAwesomeIcon icon={faHouse} />
        <span className={styles.span}>Dashboard</span>
      </div>

      <div
        className={`${styles.sidebarItem} ${isActive('/MyWebsite/property') ? styles.active : ''}`}
        onClick={() => router.push('/MyWebsite/property')}
      >
        <FontAwesomeIcon icon={faBuilding} />
        <span className={styles.span}>Properties</span>
      </div>
      <div
        className={`${styles.sidebarItem} ${isActive('/MyWebsite/bookings') ? styles.active : ''}`}
        onClick={() => router.push('/MyWebsite/bookings')}
      >
        <FontAwesomeIcon icon={faBuilding} />
        <span className={styles.span}>Bookings</span>
      </div>

      {/*<div
        className={`${styles.sidebarItem} ${isActive('/MyWebsite/profile') ? styles.active : ''}`}
        onClick={() => router.push('/MyWebsite/profile')}
      >
        <FontAwesomeIcon icon={faUserCircle} />
        <span className={styles.span}>Profile</span>
      </div>

      <div
        className={`${styles.sidebarItem} ${isActive('/MyWebsite/documents') ? styles.active : ''}`}
        onClick={() => router.push('/MyWebsite/documents')}
      >
        <FontAwesomeIcon icon={faFileAlt} />
        <span className={styles.span}>Documents</span>
      </div>*/}
    </div>
  );
}




/*// components/Sidebar.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faUserCircle, faBuilding, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import styles from './sidebar.module.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <div className={styles.sidebar}>
        <div 
            className={`${styles.sidebarItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
            onClick={() => setActiveTab('dashboard')}
            >
            <FontAwesomeIcon icon={faHouse} />
            <span className={`${styles.span} ${activeTab === 'dashboard' ? styles.active : ''}`}>Dashboard</span>
        </div>

      <div 
        className={`${styles.sidebarItem} ${activeTab === 'profile' ? styles.active : ''}`}
        onClick={() => setActiveTab('profile')}
      >
        <FontAwesomeIcon icon={faUserCircle} />
        <span className={`${styles.span} ${activeTab === 'profile' ? styles.active : ''}`}>Profile</span>
      </div>

      <div 
        className={`${styles.sidebarItem} ${activeTab === 'properties' ? styles.active : ''}`}
        onClick={() => setActiveTab('properties')}
      >
        <FontAwesomeIcon icon={faBuilding} />
        <span className={`${styles.span} ${activeTab === 'properties' ? styles.active : ''}`}>Properties</span>
      </div>

      <div 
        className={`${styles.sidebarItem} ${activeTab === 'documents' ? styles.active : ''}`}
        onClick={() => setActiveTab('documents')}
      >
        <FontAwesomeIcon icon={faFileAlt} />
        <span className={`${styles.span} ${activeTab === 'documents' ? styles.active : ''}`}>Documents</span>
      </div>

    </div>
  );
} */