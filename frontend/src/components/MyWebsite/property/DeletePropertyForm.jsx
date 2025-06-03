// DeletePropertyForm.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import styles from '../MyWebsite.module.css';
import { usePropertyData } from 'src/hooks/usePropertyData';

export default function DeletePropertyPage() {
  const router = useRouter();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const { getPropertyById, deleteProperty, isLoading: hookLoading } = usePropertyData();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
  
    const timeout = setTimeout(() => {
      const foundListing = getPropertyById(id);
      if (foundListing) {
        setListing(foundListing);
      } else {
        console.warn('No matching listing found.');
        router.push('/MyWebsite');
      }
      setIsLoading(false);
    }, 100); // Delay to wait for hydration
  
    return () => clearTimeout(timeout);
  }, [id, router, getPropertyById]);

  const handleDelete = async () => {
    try {
      const success = await deleteProperty(id);
      if (success) {
        router.push('/MyWebsite/property');
      } else {
        // Afficher un message d'erreur si nécessaire
        console.error('Failed to delete property');
      }
    } catch (error) {
      console.error('Error during deletion:', error);
    }
  };

  const handleCancel = () => {
    router.push('/MyWebsite/property');
  };

  if (isLoading || hookLoading) {
    return (
      <div className={styles.dashboardContainer}>
        <p></p>
      </div>
    );
  }
  
  if (!listing) {
    return <div className={styles.dashboardContainer}>Listing not found</div>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.sectionHeader}>
        <h2>Delete Property</h2>
      </div>
      
      <div className={styles.deleteConfirmation}>
        <h3>Are you sure you want to delete this property?</h3>
        <div className={styles.propertyInfo}>
          <p className={styles.warningText}>This action cannot be undone.</p>
        </div>
        
        <div className={styles.actionButtons}>
          <button onClick={handleCancel} className={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={handleDelete} className={styles.deleteButton}>
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}