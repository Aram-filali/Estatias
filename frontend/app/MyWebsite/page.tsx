'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ListingsTable from 'src/components/dashboard/ListingsTable';
import DashboardStats from 'src/components/dashboard/DashboardStats';
import { PlusCircle } from 'lucide-react';
import styles from 'src/components/dashboard/Dashboard.module.css';
import { initialListings } from 'src/data/initialListings';
import { Property } from '@/types/hostTypes';
import { usePropertyData } from 'src/hooks/usePropertyData';
import { auth } from '../../src/firebase'; 

export default function DashboardPage() {
  const router = useRouter();
  const { properties, isLoading, refreshProperties, currentUser } = usePropertyData();
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthChecked(true);
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/Login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Initialize with initial listings if localStorage is empty
  useEffect(() => {
    // Only attempt to initialize listings if user is authenticated
    if (currentUser) {
      const storedListings = localStorage.getItem('rentalListings');
      if (!storedListings) {
        // If no listings exist in localStorage, set the initial ones
        localStorage.setItem('rentalListings', JSON.stringify(initialListings));
        // Reload properties to reflect the initialized data
        refreshProperties();
      }
    }
  }, [refreshProperties, currentUser]);

  // Show loading state when checking auth or loading properties
  if (!authChecked || (authChecked && currentUser && isLoading)) {
    return <div className={styles.dashboardContainer}>Loading dashboard...</div>;
  }

  // If auth check is complete but no user, don't render the dashboard
  // The redirect in the useEffect should handle this, but this is a safety check
  if (authChecked && !currentUser) {
    return null;
  }

  // If we have a user and data is loaded, show the dashboard
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.sectionHeader}>
        <h2>Rental Property Listings Dashboard</h2>
        <button 
          onClick={() => router.push('/MyWebsite/property/add')} 
          className={styles.addButton}
        >
          <PlusCircle size={16} />
          Add New Listing
        </button>
      </div>
      
      <DashboardStats listings={properties} />
      <ListingsTable
        listings={properties}
        onEdit={(l: Property) => router.push(`/MyWebsite/property/edit/${l.id}`)}
        onView={(l: Property) => router.push(`/MyWebsite/property/view/${l.id}`)}
        onDelete={(l: Property) => router.push(`/MyWebsite/property/delete/${l.id}`)}
      />
    </div>
  );
}