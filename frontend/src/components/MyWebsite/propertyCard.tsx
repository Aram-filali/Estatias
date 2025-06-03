import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEdit, faTrash, faHome, faIdCard } from '@fortawesome/free-solid-svg-icons';
import styles from './MyWebsite.module.css';
import { Property } from '@/types/hostTypes';
import { useRouter } from 'next/navigation';

interface PropertyCardProps {
  property: Property;
  onEdit: () => void;
  onDelete?: () => void;
  onView: () => void;
}

export default function PropertyCard({ property, onView, onEdit, onDelete }: PropertyCardProps) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    // Clean up any object URLs when component unmounts or image changes
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);
  
  useEffect(() => {
    // Process the image when the property changes
    if (property.mainPhotos && property.mainPhotos.length > 0) {
      const displayImage = property.mainPhotos[0];
      
      // Handle different types of image data
      if (typeof displayImage === 'string') {
        setImageUrl(displayImage);
      } else if (displayImage instanceof File) {
        const url = URL.createObjectURL(displayImage);
        setImageUrl(url);
      } else if (displayImage && typeof displayImage === 'object') {
        // Handle potential Firebase or other object format
        if ('url' in displayImage && typeof displayImage.url === 'string') {
          setImageUrl(displayImage.url);
        } else if ('src' in displayImage && typeof displayImage.src === 'string') {
          setImageUrl(displayImage.src);
        } else if ('path' in displayImage && typeof displayImage.path === 'string') {
          setImageUrl(displayImage.path);
        } else {
          console.warn('Unknown image format in mainPhotos:', displayImage);
          setImageUrl('');
        }
      } else {
        setImageUrl('');
      }
    } else {
      setImageUrl('');
    }
    
    // Reset error state when property changes
    setImageError(false);
  }, [property]);
  
  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete();
    } else {
      router.push(`/MyWebsite/property/delete/${property.id}`);
    }
  };
  
  const handleImageError = () => {
    setImageError(true);
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
  };
  
  return (
    <div className={styles.propertyCard}>
      <div className={styles.propertyImage}>
        {imageUrl && !imageError ? (
          <img 
            src={imageUrl} 
            alt={property.title || 'Property image'} 
            className={styles.propertyImg}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.fallbackImage}>
            <FontAwesomeIcon icon={faHome} className={styles.fallbackIcon} />
          </div>
        )}
      </div>
      <div className={styles.propertyDetails}>
        <h3>{property.title || 'Unnamed Property'}</h3>
        <p><FontAwesomeIcon icon={faHome} /> {property.type || 'Not specified'}</p>
        <p><FontAwesomeIcon icon={faIdCard} /> {property.address || 'No address provided'}</p>
        {property.city && (
          <p className={styles.propertyLocation}>
            {property.city}
            {property.state ? `, ${property.state}` : ''}
            {property.country ? `, ${property.country}` : ''}
          </p>
        )}
      </div>
      <div className={styles.propertyActions}>
        <button 
          className={styles.viewPropertyButton}
          onClick={onView}
          title="View property details"
        >
          <FontAwesomeIcon icon={faEye} />
        </button>
        <button 
          className={styles.editPropertyButton}
          onClick={onEdit}
          title="Edit property"
        >
          <FontAwesomeIcon icon={faEdit} />
        </button>
        <button 
          className={styles.deletePropertyButton}
          onClick={handleDeleteClick}
          title="Delete property"
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>
    </div>
  );
}