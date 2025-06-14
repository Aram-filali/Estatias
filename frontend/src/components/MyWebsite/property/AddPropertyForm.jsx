// app/dashboard/property/add/page.jsx
'use client';

import { useRouter } from 'next/navigation';
import ListingForm from 'src/components/dashboard/ListingForm';
import styles from 'src/components/dashboard/Dashboard.module.css';
import { usePropertyData } from 'src/hooks/usePropertyData';
import SEOBoostPopup from '../../dashboard/AI/SEOBoost';
import {useState } from 'react';

export default function AddPropertyPage() {
  const router = useRouter();
  const { addProperty } = usePropertyData();
      const [showSEOBoostPopup, setShowSEOBoostPopup] = useState(false);
      const [pendingSubmissionData, setPendingSubmissionData] = useState(null);
  
  const handleAddListing = (newListing) => {
    // Use the shared hook to add the property
    addProperty(newListing);
    
    // Navigate back to the dashboard
    router.push('/MyWebsite');
  };

  const handleSEOBoost = async (generatedContent = {}) => {
  setShowSEOBoostPopup(false);
  
  try {
    console.log('=== DÉBUT handleSEOBoost ===');
    console.log('Contenu généré reçu:', generatedContent);
    console.log('FormData actuel:', {
      title: formData.title,
      description: formData.description
    });
    
    // Utiliser directement formData car il est déjà mis à jour par les callbacks
    const overrideData = {
      title: formData.title || '',
      description: formData.description || ''
    };
    
    console.log('Données override finales:', overrideData);
    
    // Passer les données override à handleActualSubmit
    await handleActualSubmit(overrideData);
    
  } catch (error) {
    console.error('Error during SEO boost:', error);
    safeSetNotification({
      show: true,
      message: 'Error during submission. Please try again.',
      type: 'error'
    });
  }
};

// CORRECTION : Ajouter une fonction pour mettre à jour formData quand l'IA génère du contenu
const handleTitleGenerated = (title) => {
  console.log('=== TITRE GÉNÉRÉ ===', title);
  setFormData(prev => {
    const updated = { ...prev, title };
    console.log('FormData mis à jour avec titre:', updated);
    return updated;
  });
};

const handleDescriptionGenerated = (description) => {
  console.log('=== DESCRIPTION GÉNÉRÉE ===', description);
  setFormData(prev => {
    const updated = { ...prev, description };
    console.log('FormData mis à jour avec description:', updated);
    return updated;
  });
};

// GARDER handleSkipSEO simple
const handleSkipSEO = async () => {
  setShowSEOBoostPopup(false);
  await handleActualSubmit();
};

// Handle closing popup without action
const handleClosePopup = () => {
  setShowSEOBoostPopup(false);
  setPendingSubmissionData(null);
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

      <SEOBoostPopup 
      isOpen={showSEOBoostPopup}
      onClose={handleClosePopup}
      onBoost={handleSEOBoost}
      onSkip={handleSkipSEO}
      onTitleGenerated={handleTitleGenerated}
      onDescriptionGenerated={handleDescriptionGenerated}
    />
    </div>
  );
}