//app/propertydetails/[id]/page.js
"use client";

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import MapComponent from 'src/components/Map';
import PropertyReview from 'src/components/PropertyReview';
import BookingComponent from 'src/components/bookingComponent';
import styles from '../../../styles/propertyDetails.module.css';

export default function PropertyDetails({ params }) {
  // Use React.use to unwrap params
  const { id } = React.use(params);
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allPhotos, setAllPhotos] = useState([]);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        console.log("Fetching property with ID:", id);
        
        // In a real app, this would be an environment variable or config
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/properties/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data) {
          throw new Error("No data received");
        }
        
        setProperty(data);

        const combinedPhotos = [
          ...(data.mainPhotos || []),
          ...(data.apartmentSpaces?.flatMap(space => space.photos || []) || [])
        ];
        setAllPhotos(combinedPhotos);

      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [id]);

  const prevImage = () => {
    if (!allPhotos?.length) return;
    setCurrentImageIndex(prev => 
      prev === 0 ? allPhotos.length - 1 : prev - 1
    );
  };

  const nextImage = () => {
    if (!allPhotos?.length) return;
    setCurrentImageIndex(prev => 
      prev === allPhotos.length - 1 ? 0 : prev + 1
    );
  };

  useEffect(() => {
    if (!allPhotos?.length) return;
    const intervalId = setInterval(nextImage, 5000);
    return () => clearInterval(intervalId);
  }, [currentImageIndex, allPhotos]);

  if (loading) {
    return <div className={styles.loading}>Loading property details...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  if (!property) {
    return <div className={styles.notFound}>Property not found</div>;
  }

  return (
    <div className={styles.bg}>
      <Head>
        <title>{property.title} | Property Details</title>
        <meta name="description" content={property.description} />
      </Head>
      
      <div className={styles.container}>
        <section className={styles.propertySection}>
          <div className={styles.sectionGrid1}>
            <h2 className={styles.sectionTitle}>{property.title}</h2>
          </div>
          
          {/* Property Image Gallery */}
          <div className={styles.containerr}>
            {/* Main Slider */}
            <div className={styles.sliderContainer} style={{
              maxWidth: '1200px',
              height: 'auto',
              aspectRatio: '18/7',
              margin: '0 auto'
            }}>
              <div
                className={styles.slider}
                style={{
                  transform: `translateX(-${currentImageIndex * 100}%)`,
                  height: '100%'
                }}
              >
                {allPhotos?.map((img, index) => (
                  <div key={index} className={styles.slide} style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    flexShrink: 0
                  }}>
                    <Image
                      src={img}
                      alt={`Property image ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
                      style={{ 
                        objectFit: 'contain',
                        objectPosition: 'center'
                      }}
                      priority={index === 0}
                      quality={100}
                      unoptimized={true}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Thumbnail Navigation */}
            <div className={styles.thumbnailNavContainer}>
              <button 
                onClick={prevImage} 
                className={`${styles.navButton} ${styles.navButtonLeft}`}
                aria-label="Previous image"
              >
                ←
              </button>

              {/* Thumbnails */}
              <div className={styles.thumbnailContainer}>
                {allPhotos?.map((img, index) => (
                  <div
                    key={index}
                    className={`${styles.thumbnail} ${
                      index === currentImageIndex ? styles.activeThumbnail : ""
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                    role="button"
                    aria-label={`View image ${index + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      sizes="120px"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>

              <button 
                onClick={nextImage} 
                className={`${styles.navButton} ${styles.navButtonRight}`}
                aria-label="Next image"
              >
                →
              </button>
            </div>
          </div>
        </section>

        <section className={styles.propertySection}>
          <div className={styles.sectionGrid}>
            <div>
              <h2 className={styles.sectionTitle}>About</h2>
              <p className={styles.sectionText}>
                {property.description}
              </p>
              
              <ul className={styles.propertyList}>
                <li><span>✓</span> <span>{property.bedrooms} bedrooms, {property.bathrooms} bathrooms</span></li>
                <li><span>✓</span> <span>Accommodates up to {property.maxGuest} guests</span></li>
                {property.floorNumber!= null && (
                  <li><span>✓</span> <span>Floor number: {property.floorNumber}</span></li>
                )}
                {property.lotSize!= null && (
                  <li><span>✓</span> <span>Lot size: {property.lotSize} m²</span></li>
                )}
                <li><span>✓</span> <span>Size: {property.size} m²</span></li>
              </ul>
              
              <h3 className={styles.featuresTitle}>Amenities</h3>
              <div className={styles.featuresGrid}>
                {property.amenities && Object.entries(property.amenities).map(([amenity, available]) => (
                  available && (
                    <div key={amenity} className={styles.featureItem}>
                      <span className={styles.featureIcon}>✓</span>
                      <span>{amenity}</span>
                    </div>
                  )
                ))}
              </div>
              
              <div className={styles.propertyCard}>
                <h3 className={styles.propertyCardTitle}>Location Details</h3>
                <div className={styles.propertyCardContent}>
                  <p className={styles.propertyCardText}>
                    {property.address}, {property.city}, {property.state}, {property.country}
                  </p>
                </div>
              </div>

              <div className={styles.propertyCard}>
                <h3 className={styles.propertyCardTitle}>Policies</h3>
                <div className={styles.propertyCardContent}>
                  {property.policies && Object.entries(property.policies).map(([policy, description]) => (
                    <div key={policy} className={styles.propertyCardItem}>
                      <p className={styles.propertyCardText}>
                        <strong>{policy}:</strong> {description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Booking component - Right side */}
            <div>
              <BookingComponent 
                propertyId={property.id}
                maxGuest={property.maxGuest}
                minNight={property.minNight}
                maxNight={property.maxNight}
              />

             
            </div>
          </div>
          
            <PropertyReview propertyId={property.id} />
             
          <div className={styles.mapContainer}>
            <h3 className={styles.locationTitle}>Location</h3>
            <MapComponent 
              address={`${property.address}, ${property.city}, ${property.country}`}
               
            />
          </div>
        </section>
      </div>
    </div>
  );
}