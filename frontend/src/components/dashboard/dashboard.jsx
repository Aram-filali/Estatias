// app/dashboard/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ListingsTable from 'src/components/dashboard/ListingsTable';
import DashboardStats from 'src/components/dashboard/DashboardStats';
import { PlusCircle } from 'lucide-react';
import styles from './Dashboard.module.css';
import { initialListings } from 'src/data/initialListings';

export default function DashboardPage() {
  const router = useRouter();
  const [listings, setListings] = useState([]);
  
  
  useEffect(() => {
    const storedListings = localStorage.getItem('rentalListings');
    const parsedListings = storedListings ? JSON.parse(storedListings) : [];
  
    if (parsedListings.length > 0) {
      setListings(parsedListings);
    } else {
      // Restore initial data if localStorage is empty or missing
      setListings(initialListings);
      localStorage.setItem('rentalListings', JSON.stringify(initialListings));
    }
  }, []);
  
  
  // Handle redirects to various property operations
  const handleAddListing = () => {
    router.push('/MyWebsite/property/add');
  };
  
  const handleEditListing = (listing) => {
    router.push(`/MyWebsite/property/edit/${listing.id}`);
  };
  
  const handleViewListing = (listing) => {
    router.push(`/MyWebsite/property/view/${listing.id}`);
  };
  
  const handleDeleteListing = (listing) => {
    console.log("🔍 Listing ID for delete:", listing.id);
    router.push(`/MyWebsite/property/delete/${listing.id}`);
  };
  
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.sectionHeader}>
        <h2>Rental Property Listings Dashboard</h2>
        <button 
          onClick={handleAddListing}
          className={styles.addButton}
        >
          <PlusCircle size={16} />
          Add New Listing
        </button>
      </div>
      
      <DashboardStats listings={listings} />
      
      <ListingsTable 
        listings={listings} 
        onEdit={handleEditListing}
        onView={handleViewListing}
        onDelete={handleDeleteListing}
      />
    </div>
  );
}