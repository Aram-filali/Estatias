'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ListingForm from 'src/components/dashboard/ListingFormUpdate';
import styles from 'src/components/dashboard/Dashboard.module.css';
import { usePropertyData } from 'src/hooks/usePropertyData';

export default function EditPropertyForm() {
  const { id } = useParams();
  const router = useRouter();
  const { 
    getPropertyById, 
    updateProperty, 
    isLoading: hookLoading,
    error: propertyError
  } = usePropertyData();
  
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

 // In EditPropertyForm component
 // Dans le useEffect de EditPropertyForm
useEffect(() => {
  if (!id) return;

  const fetchProperty = async () => {
    try {
      setIsLoading(true);
      const property = await getPropertyById(id);
      
      if (!property) {
        setError('Property not found');
        return;
      }

      // Normalisation approfondie des données
      setListing({
        ...property,
        id: property._id || property.id,
        mainPhotos: property.mainPhotos?.map(photo => photo || '') || [],
        apartmentSpaces: property.apartmentSpaces?.map(space => ({
          ...space,
          photos: space.photos?.map(photo => photo || '') || []
        })) || [],
        amenities: property.amenities || {},
        policies: property.policies || {},
        means_of_payment: property.means_of_payment || []
      });

    } catch (err) {
      setError(err.message || 'Failed to load property');
    } finally {
      setIsLoading(false);
    }
  };

  fetchProperty();
}, [id]);

// Modifiez handleUpdateListing comme suit :
const handleUpdateListing = async (updatedListing) => {
  if (!listing?.id) {
    setError('Invalid property ID');
    return;
  }

  try {
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData();
    
    // Traitement des photos principales
    const newMainPhotos = updatedListing.mainPhotos?.filter(photo => photo instanceof File) || [];
    newMainPhotos.forEach(photo => formData.append('mainPhotos', photo));

    // Traitement des photos des espaces
    updatedListing.apartmentSpaces?.forEach((space, spaceIndex) => {
      space.photos?.filter(photo => photo instanceof File)
        .forEach(photo => {
          formData.append(`apartmentSpaces[${spaceIndex}].photos`, photo);
        });
    });

    // Préparation des données JSON
    const jsonData = {
      ...updatedListing,
      mainPhotos: updatedListing.mainPhotos?.filter(photo => typeof photo === 'string') || [],
      apartmentSpaces: updatedListing.apartmentSpaces?.map(space => ({
        ...space,
        photos: space.photos?.filter(photo => typeof photo === 'string') || []
      })) || []
    };

    formData.append('propertyData', JSON.stringify(jsonData));

    // Envoi de la requête PATCH
    await updateProperty(listing.id, formData);
    
    // Redirection IMMÉDIATE vers la page de visualisation
    router.push(`/MyWebsite/property/view/${listing.id}`);
    
  } catch (error) {
    console.error('Update error:', error);
    setError(error.response?.data?.message || error.message || 'Update failed');
  } finally {
    setIsLoading(false);
  }
};

  // Affichage du chargement
  if (isLoading || hookLoading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.loadingState}>
          <p></p>
        </div>
      </div>
    );
  }

  // Gestion des erreurs
  if (error || propertyError) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.errorState}>
          <h2>Error</h2>
          <p>{error || propertyError}</p>
          <button
            onClick={() => router.push('/MyWebsite/property')}
            className={styles.backButton}
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  // Vérification des données de la propriété
  if (!listing) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.emptyState}>
          <h2>Property Not Found</h2>
          <p>The requested property could not be loaded.</p>
          <button
            onClick={() => router.push('/MyWebsite/property')}
            className={styles.backButton}
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  // Vérification de l'ID temporaire
  if (typeof id === 'string' && id.startsWith('temp-')) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.errorState}>
          <h2>Temporary Property</h2>
          <p>This property hasn't been saved yet.</p>
          <button
            onClick={() => router.push('/MyWebsite/property')}
            className={styles.backButton}
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  // Rendu normal du formulaire
  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.sectionHeader}>
        <h2>Edit Rental Property</h2>
        <button
          onClick={() => router.push('/MyWebsite/property')}
          className={styles.backButton}
        >
          Back to Listings
        </button>
      </div>

      <ListingForm
        initialData={listing}
        onSubmit={handleUpdateListing}
        onCancel={() => router.push('/MyWebsite/property')}
      />
    </div>
  );
}