'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Edit, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import styles from 'src/components/dashboard/Dashboard.module.css';
import { usePropertyData } from 'src/hooks/usePropertyData';

export default function ViewPropertyPage() {
  const router = useRouter();
  const { id } = useParams();
  const { 
    getPropertyById, 
    isLoading, 
    error 
  } = usePropertyData();
  const [listing, setListing] = useState(null);
  const [activeSpaceIndex, setActiveSpaceIndex] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  useEffect(() => {
    if (!id) return;

    const fetchProperty = async () => {
      try {
        const foundListing = await getPropertyById(id);
        if (foundListing) {
          setListing(foundListing);
        } else {
          router.push('/MyWebsite');
        }
      } catch (err) {
        console.error('Failed to fetch property:', err);
        router.push('/MyWebsite');
      }
    };

    fetchProperty();
  }, [id, router, getPropertyById]);

  if (isLoading) {
    return <div className={styles.dashboardContainer}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.dashboardContainer}>Error: {error}</div>;
  }

  if (!listing) {
    return <div className={styles.dashboardContainer}>Property not found</div>;
  }

  // Function to format payment methods
  const formatPaymentMethods = () => {
    if (!listing.means_of_payment) return [];
    
    return listing.means_of_payment.map(method => {
      // Map payment method names for more readable display
      switch(method.toLowerCase()) {
        case 'credit card': return 'Credit Card';
        case 'debit card': return 'Debit Card';
        case 'paypal': return 'PayPal';
        case 'cash': return 'Cash';
        case 'check': return 'Check';
        case 'bank transfer': return 'Bank Transfer';
        default: return method;
      }
    });
  };

  // Function to open the photo viewer modal for a specific space
  const openPhotoViewer = (spaceIndex) => {
    setActiveSpaceIndex(spaceIndex);
    setCurrentPhotoIndex(0);
  };

  // Function to close the photo viewer modal
  const closePhotoViewer = () => {
    setActiveSpaceIndex(null);
  };

  // Navigate to the next photo in the current space
  const nextPhoto = () => {
    if (activeSpaceIndex === null) return;
    
    const space = listing.apartmentSpaces[activeSpaceIndex];
    const photos = getSpacePhotos(space);
    
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else {
      setCurrentPhotoIndex(0); // Loop back to the first photo
    }
  };

  // Navigate to the previous photo in the current space
  const prevPhoto = () => {
    if (activeSpaceIndex === null) return;
    
    const space = listing.apartmentSpaces[activeSpaceIndex];
    const photos = getSpacePhotos(space);
    
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    } else {
      setCurrentPhotoIndex(photos.length - 1); // Loop to the last photo
    }
  };

  // Helper function to get photos from a space, handling different data structures
  const getSpacePhotos = (space) => {
    if (!space) return [];
    
    // Handle different possible photo data structures
    if (space.photos && Array.isArray(space.photos)) {
      return space.photos;
    } else if (space.photos && typeof space.photos === 'object') {
      // If photos is an object with URLs as values
      return Object.values(space.photos);
    } else if (space.images && Array.isArray(space.images)) {
      return space.images;
    } else if (space.photoUrls && Array.isArray(space.photoUrls)) {
      return space.photoUrls;
    }
    
    return [];
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.sectionHeader}>
        <h2>View Property Details</h2>
        <div>
          <button 
            onClick={() => router.push(`/MyWebsite/property/edit/${listing.id}`)}
            className={styles.editButton}
          >
            <Edit size={16} />
            Edit Listing
          </button>
          <button 
            onClick={() => router.push('/MyWebsite/property')}
            className={styles.backButton}
          >
            Back to Listings
          </button>
        </div>
      </div>
      
      <div className={styles.listingDetails}>
        <div className={styles.detailsHeader}>
          <h2>{listing.title}</h2>
          <div className={styles.propertyStatus}>
          </div>
        </div>
        
        <div className={styles.detailsContent}>
          <div className={styles.basicInfo}>
            <h3>Basic Information</h3>
            <div className={styles.infoGrid}>
              <div>
                <strong>Type:</strong> {listing.type}
              </div>
              <div>
                <strong>Status:</strong> {listing.status || 'pending'}
              </div>
              <div>
                <strong>Price:</strong> ${listing.price || '0'}/night
              </div>
              <div>
                <strong>Tourist Tax:</strong> {listing.touristTax || '0'}%
              </div>
              <div>
                <strong>Location:</strong> {listing.place}
              </div>
              <div>
                <strong>Address:</strong> {listing.address}, {listing.city}, {listing.state}, {listing.country}
              </div>
              <div>
                <strong>Size:</strong> {listing.size || '0'} sq ft
              </div>
              {listing.type !== 'apartment' && (
                <div>
                  <strong>Lot Size:</strong> {listing.lotSize || '0'} sq ft
                </div>
              )}
              {listing.type === 'apartment' && (
                <div>
                  <strong>Floor Number:</strong> {listing.floorNumber || '0'}
                </div>
              )}
            </div>
          </div>
          
          <div className={styles.roomInfo}>
            <h3>Room Information</h3>
            <div className={styles.infoGrid}>
              <div>
                <strong>Rooms:</strong> {listing.rooms || '0'}
              </div>
              <div>
                <strong>Bedrooms:</strong> {listing.bedrooms || '0'}
              </div>
              <div>
                <strong>Bathrooms:</strong> {listing.bathrooms || '0'}
              </div>
              <div>
                <strong>Beds:</strong> {listing.beds_Number || '0'}
              </div>
              <div>
                <strong>Max Guests:</strong> {listing.maxGuest || '0'}
              </div>
              <div>
                <strong>Min Nights:</strong> {listing.minNight || '0'}
              </div>
              <div>
                <strong>Max Nights:</strong> {listing.maxNight || '0'}
              </div>
              <div>
                <strong>Balconies:</strong> {listing.numberOfBalconies || '0'}
              </div>
            </div>
          </div>
          
          {listing.apartmentSpaces && listing.apartmentSpaces.length > 0 && (
            <div className={styles.spacesInfo}>
              <h3>Property Spaces</h3>
              <div className={styles.spacesGrid}>
                {listing.apartmentSpaces.map((space, index) => {
                  const photos = getSpacePhotos(space);
                  const hasPhotos = photos.length > 0;
                  
                  return (
                    <div key={space.space_id || index} className={styles.spaceCard}>
                      <h4>{`Space ${index + 1}`}</h4>
                      <p><strong>Type:</strong> {space.type || '0'}</p>
                      <p><strong>Area:</strong> {space.area || '0'} sq ft</p>
                      
                      {hasPhotos ? (
                        <div className={styles.spacePhotoGallery}>
                          <div 
                            className={styles.spacePhotoPreview}
                            onClick={() => openPhotoViewer(index)}
                          >
                            <img 
                              src={photos[0]} 
                              alt={`${space.type || `Space ${index + 1}`} preview`}
                              className={styles.previewImage}
                            />
                            <div className={styles.photoCount}>
                              <ImageIcon size={16} />
                              <span>{photos.length} Photos</span>
                            </div>
                          </div>
                          
                          <div className={styles.thumbnailStrip}>
                            {photos.slice(0, 3).map((photo, photoIndex) => (
                              <img 
                                key={photoIndex}
                                src={photo}
                                alt={`Thumbnail ${photoIndex + 1}`}
                                className={styles.thumbnail}
                                onClick={() => {
                                  openPhotoViewer(index);
                                  setCurrentPhotoIndex(photoIndex);
                                }}
                              />
                            ))}
                            {photos.length > 3 && (
                              <div 
                                className={styles.moreThumbnails}
                                onClick={() => openPhotoViewer(index)}
                              >
                                +{photos.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={styles.noPhotos}>
                          <ImageIcon size={24} />
                          <p>No photos available</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Photo Viewer Modal */}
          {activeSpaceIndex !== null && listing.apartmentSpaces[activeSpaceIndex] && (
            <div className={styles.photoViewerOverlay} onClick={closePhotoViewer}>
              <div className={styles.photoViewerContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={closePhotoViewer}>×</button>
                
                <h3>{listing.apartmentSpaces[activeSpaceIndex].type || `Space ${activeSpaceIndex + 1}`}</h3>
                
                <div className={styles.photoViewerMain}>
                  <button className={styles.navButton} onClick={prevPhoto}>
                    <ChevronLeft size={24} />
                  </button>
                  
                  <div className={styles.mainPhotoContainer}>
                    <img 
                      src={getSpacePhotos(listing.apartmentSpaces[activeSpaceIndex])[currentPhotoIndex]} 
                      alt={`Photo ${currentPhotoIndex + 1}`}
                      className={styles.mainPhoto}
                    />
                  </div>
                  
                  <button className={styles.navButton} onClick={nextPhoto}>
                    <ChevronRight size={24} />
                  </button>
                </div>
                
                <div className={styles.photoCounter}>
                  {currentPhotoIndex + 1} / {getSpacePhotos(listing.apartmentSpaces[activeSpaceIndex]).length}
                </div>
                
                <div className={styles.photoThumbnails}>
                  {getSpacePhotos(listing.apartmentSpaces[activeSpaceIndex]).map((photo, idx) => (
                    <img 
                      key={idx}
                      src={photo}
                      alt={`Thumbnail ${idx + 1}`}
                      className={`${styles.photoThumbnail} ${idx === currentPhotoIndex ? styles.activeThumbnail : ''}`}
                      onClick={() => setCurrentPhotoIndex(idx)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className={styles.contactInfo}>
            <h3>Contact Information</h3>
            <div className={styles.infoGrid}>
              <div>
                <strong>Phone:</strong> {listing.phone || 'Not specified'}
              </div>
              <div>
                <strong>Email:</strong> {listing.email || 'Not specified'}
              </div>
              <div>
                <strong>Website:</strong> {listing.website ? (
                  <a href={listing.website} target="_blank" rel="noopener noreferrer">
                    {listing.website}
                  </a>
                ) : 'Not specified'}
              </div>
            </div>
          </div>
          
          <div className={styles.description}>
            <h3>Description</h3>
            <p>{listing.description || 'No description provided'}</p>
          </div>
          
          {listing.amenities && (
            <div className={styles.amenities}>
              <h3>Amenities</h3>
              <div className={styles.amenitiesList}>
                {Object.entries(listing.amenities).map(([key, value]) => (
                  value && (
                    <span key={key} className={styles.amenityTag}>
                      {key.replace(/_/g, ' ')}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}
          
          {listing.policies && (
            <div className={styles.policies}>
              <h3>Policies</h3>
              <div className={styles.policiesInfo}>
                <div>
                  <strong>Smoking:</strong> {listing.policies.smoking ? 'Allowed' : 'Not Allowed'}
                </div>
                <div>
                  <strong>Pets:</strong> {listing.policies.pets ? 'Allowed' : 'Not Allowed'}
                </div>
                <div>
                  <strong>Parties/Events:</strong> {listing.policies.parties_or_events ? 'Allowed' : 'Not Allowed'}
                </div>
                <div>
                  <strong>Check-in:</strong> {listing.policies.check_in_start || 'Not specified'} - {listing.policies.check_in_end || 'Not specified'}
                </div>
                <div>
                  <strong>Check-out:</strong> By {listing.policies.check_out_end || 'Not specified'}
                </div>
                {listing.policies.quiet_hours_start && listing.policies.quiet_hours_end && (
                  <div>
                    <strong>Quiet Hours:</strong> {listing.policies.quiet_hours_start} - {listing.policies.quiet_hours_end}
                  </div>
                )}
                {listing.policies.cleaning_maintenance && (
                  <div>
                    <strong>Cleaning:</strong> {listing.policies.cleaning_maintenance}
                  </div>
                )}
                {listing.policies.cancellation_policy && (
                  <div>
                    <strong>Cancellation:</strong> {listing.policies.cancellation_policy}
                  </div>
                )}
                <div>
                  <strong>Additional Guests:</strong> {listing.policies.guests_allowed ? 'Allowed' : 'Not Allowed'}
                </div>
              </div>
            </div>
          )}
          
          <div className={styles.payment}>
            <h3>Payment Methods</h3>
            <div className={styles.paymentList}>
              {formatPaymentMethods().map((method, index) => (
                <span key={index} className={styles.paymentTag}>
                  {method}
                </span>
              ))}
              {(!listing.means_of_payment || listing.means_of_payment.length === 0) && (
                <span>No payment methods specified</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}