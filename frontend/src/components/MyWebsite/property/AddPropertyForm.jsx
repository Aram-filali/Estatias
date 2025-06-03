// app/dashboard/property/add/page.jsx
'use client';

import { useRouter } from 'next/navigation';
import ListingForm from 'src/components/dashboard/ListingForm';
import styles from 'src/components/dashboard/Dashboard.module.css';
import { usePropertyData } from 'src/hooks/usePropertyData';

export default function AddPropertyPage() {
  const router = useRouter();
  const { addProperty } = usePropertyData();
  
  const handleAddListing = (newListing) => {
    // Use the shared hook to add the property
    addProperty(newListing);
    
    // Navigate back to the dashboard
    router.push('/MyWebsite');
  };
  
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.sectionHeader}>
        <h2>Add New Rental Property</h2>
        <button 
          onClick={() => router.push('/MyWebsite/property')}
          className={styles.backButton}
        >
          Back to Listings
        </button>
      </div>
      
      <ListingForm 
        initialData={null}
        onSubmit={handleAddListing}
        onCancel={() => router.push('/MyWebsite/property')}
      />
    </div>
  );
}