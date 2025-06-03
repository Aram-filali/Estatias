import React, { useEffect, useCallback, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import styles from './MyWebsite.module.css';
import { Property } from '@/types/hostTypes';
import PropertyCard from './propertyCard';
import { usePropertyData } from '../../hooks/usePropertyData';
import DeleteConfirmationModal from './deleteProp';


interface PropertiesTabProps {
  onViewProperty: (id: string) => void;
  onEditProperty: (id: string) => void;
  onDeleteProperty: (id: string) => void;
  onAddProperty: () => void;
}

export default function PropertiesTab({
  onViewProperty,
  onEditProperty,
  onDeleteProperty,
  onAddProperty
}: PropertiesTabProps) {
  const { properties, isLoading, error, refreshProperties, deleteProperty, currentUser } = usePropertyData();
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const refreshData = useCallback(() => {
    if (currentUser) {
      refreshProperties();
    }
  }, [refreshProperties, currentUser]);
  
  // Modified to show the modal instead of window.confirm
  const handleDeleteProperty = (id: string) => {
    setPropertyToDelete(id);
    setIsDeleteModalOpen(true);
  };


  // Filter out properties with duplicate IDs
  useEffect(() => {
    if (properties && properties.length > 0) {
      // Create a map to track seen IDs
      const seenIds = new Map<string, boolean>();
      const duplicateIds = new Set<string>();
      const validProperties: Property[] = [];
      
      // First pass: identify duplicates
      properties.forEach(property => {
        if (!property.id) return; // Skip properties without IDs
        
        if (seenIds.has(property.id)) {
          duplicateIds.add(property.id);
        } else {
          seenIds.set(property.id, true);
        }
      });
      
      // Second pass: build filtered list
      properties.forEach(property => {
        // Skip properties without IDs instead of generating temp ones
        if (!property.id) {
          console.error('Property without ID found:', property);
          return;
        }
      
        // If this is the first occurrence of a duplicate ID, keep it
        if (duplicateIds.has(property.id) && seenIds.get(property.id)) {
          seenIds.set(property.id, false); // Mark as processed
          validProperties.push(property);
          return;
        }
        
        // If this is not a duplicate, or we've already processed the first instance of this duplicate
        if (!duplicateIds.has(property.id)) {
          validProperties.push(property);
        } else {
          console.warn(`Skipping duplicate property with ID: ${property.id}`);
        }
      });
      
      // If duplicates were found, log a warning
      if (duplicateIds.size > 0) {
        console.error('Duplicate property IDs detected:', Array.from(duplicateIds));
        console.warn('Some properties with duplicate IDs have been filtered out. Please check your data source.');
      }
      
      // Ensure each property has mainPhotos array (even if empty)
      const propertiesWithPhotos = validProperties.map(property => ({
        ...property,
        mainPhotos: property.mainPhotos || []
      }));
      
      setFilteredProperties(propertiesWithPhotos);
    } else {
      setFilteredProperties([]);
    }
  }, [properties]);

  const confirmDelete = async () => {
    if (!propertyToDelete) return;
    
    try {
      const success = await deleteProperty(propertyToDelete);
      if (success) {
        onDeleteProperty(propertyToDelete);
      } else {
        refreshData();
        onDeleteProperty(propertyToDelete);
      }
    } catch (err) {
      console.error('Failed to delete property:', err);
      refreshData();
    } finally {
      // Close the modal and reset state
      setIsDeleteModalOpen(false);
      setPropertyToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setPropertyToDelete(null);
  };
  
  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [refreshData, currentUser]);
  
  
  if (!currentUser) {
    return (
      <div className={styles.propertiesSection}>
        <div className={styles.sectionHeader}>
          <h2>Your Properties</h2>
        </div>
        <div className={styles.errorState}>
          <p>You need to be logged in to view your properties.</p>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className={styles.propertiesSection}>
        <div className={styles.sectionHeader}>
          <h2>Your Properties</h2>
        </div>
        <div className={styles.errorState}>
          <p>Error loading properties: {error}</p>
          <button 
            className={styles.retryButton}
            onClick={refreshData}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className={styles.propertiesSection}>
        <div className={styles.sectionHeader}>
          <h2>Your Properties</h2>
        </div>
        <div className={styles.loadingState}>
          Loading properties...
        </div>
      </div>
    );
  }
  
    return (
      <div className={styles.propertiesSection}>
        <div className={styles.sectionHeader}>
          <h2>Your Properties</h2>
          <button 
            className={styles.addButton}
            onClick={onAddProperty}
          >
            Add New Property
          </button>
        </div>
        
        {filteredProperties.length > 0 ? (
          <div className={styles.propertiesList}>
            {filteredProperties.map((property: Property) => (
              <PropertyCard 
                key={property.id}
                property={property}
                onView={() => onViewProperty(property.id || '')}
                onEdit={() => onEditProperty(property.id || '')}
                onDelete={() => handleDeleteProperty(property.id || '')}
              />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FontAwesomeIcon icon={faHome} size="3x" />
            </div>
            <h3>No Properties Listed</h3>
            <p>Start by adding your first property to begin receiving bookings.</p>
            <button 
              className={styles.addButton}
              onClick={onAddProperty}
            >
              Add Your First Property
            </button>
          </div>
        )}
        
        {/* Add the DeleteConfirmationModal component */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Property"
          message1="Are you sure you want to delete this property?"
        />
      </div>
    );
  }