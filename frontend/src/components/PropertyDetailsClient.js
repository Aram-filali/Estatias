//components/PropertyDetailsClient.js
"use client";

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import MapComponent from '@/src/components/Map';
import PropertyReview from '@/src/components/review/PropertyReview';
import BookingComponent from '@/src/components/bookingComponent';
import styles from '@/styles/propertyDetails.module.css';

export default function PropertyDetailsClient({ property, propertyId }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allPhotos, setAllPhotos] = useState([]);

  useEffect(() => {
    if (property) {
      const combinedPhotos = [
        ...(property.mainPhotos || []),
        ...(property.apartmentSpaces?.flatMap(space => space.photos || []) || [])
      ];
      setAllPhotos(combinedPhotos);
    }
  }, [property]);

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

  if (!property) {
    return <div className={styles.loading}>Loading property details...</div>;
  }

  return (
    <div className={styles.bg}>
      {/* Enhanced Head with additional meta tags for client-side updates */}
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Preload critical images */}
        {allPhotos.slice(0, 3).map((img, index) => (
          <link key={index} rel="preload" as="image" href={img} />
        ))}
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//nominatim.openstreetmap.org" />
        <link rel="dns-prefetch" href="//tile.openstreetmap.org" />
      </Head>
      
      <div className={styles.container}>
        {/* Enhanced semantic HTML structure */}
        <main className={styles.propertySection}>
          <header className={styles.sectionGrid1}>
            <h1 className={styles.sectionTitle} itemProp="name">
              {property.title}
            </h1>
            <div className="property-location" itemProp="address">
              📍 {property.address}, {property.city}, {property.state}, {property.country}
            </div>
          </header>
          
          {/* Property Image Gallery with enhanced accessibility */}
          <section className={styles.containerr} aria-label="Property images">
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
                role="img"
                aria-label={`Property image ${currentImageIndex + 1} of ${allPhotos.length}`}
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
                      alt={`${property.title} - Interior view ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
                      style={{ 
                        objectFit: 'contain',
                        objectPosition: 'center'
                      }}
                      priority={index === 0}
                      quality={90}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      unoptimized={true}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced thumbnail navigation */}
            <nav className={styles.thumbnailNavContainer} aria-label="Image navigation">
              <button 
                onClick={prevImage} 
                className={`${styles.navButton} ${styles.navButtonLeft}`}
                aria-label="Previous image"
                type="button"
              >
                ←
              </button>

              <div className={styles.thumbnailContainer} role="tablist">
                {allPhotos?.map((img, index) => (
                  <button
                    key={index}
                    className={`${styles.thumbnail} ${
                      index === currentImageIndex ? styles.activeThumbnail : ""
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                    role="tab"
                    aria-selected={index === currentImageIndex}
                    aria-label={`View image ${index + 1}`}
                    type="button"
                  >
                    <Image
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      sizes="120px"
                      style={{ objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>

              <button 
                onClick={nextImage} 
                className={`${styles.navButton} ${styles.navButtonRight}`}
                aria-label="Next image"
                type="button"
              >
                →
              </button>
            </nav>
          </section>
        </main>

        <section className={styles.propertySection}>
          <div className={styles.sectionGrid}>
            <article>
              <h2 className={styles.sectionTitle}>About This Property</h2>
              <p className={styles.sectionText} itemProp="description">
                {property.description}
              </p>
              
              {/* Enhanced property features with schema markup */}
              <ul className={styles.propertyList} itemScope itemType="https://schema.org/Accommodation">
                <li><span>✓</span> <span itemProp="numberOfRooms">{property.bedrooms} bedrooms</span>, <span itemProp="numberOfBathroomsTotal">{property.bathrooms} bathrooms</span></li>
                <li><span>✓</span> <span>Accommodates up to <span itemProp="occupancy">{property.maxGuest}</span> guests</span></li>
                {property.floorNumber != null && (
                  <li><span>✓</span> <span>Floor number: {property.floorNumber}</span></li>
                )}
                {property.lotSize != null && (
                  <li><span>✓</span> <span>Lot size: {property.lotSize} m²</span></li>
                )}
                <li><span>✓</span> <span>Size: <span itemProp="floorSize">{property.size} m²</span></span></li>
              </ul>
              
              {/* Amenities section with enhanced SEO */}
              <section>
                <h3 className={styles.featuresTitle}>Amenities & Features</h3>
                <div className={styles.featuresGrid} itemProp="amenityFeature">
                  {property.amenities && Object.entries(property.amenities).map(([amenity, available]) => (
                    available && (
                      <div key={amenity} className={styles.featureItem} itemScope itemType="https://schema.org/LocationFeatureSpecification">
                        <span className={styles.featureIcon}>✓</span>
                        <span itemProp="name">{amenity}</span>
                      </div>
                    )
                  ))}
                </div>
              </section>
              
              {/* Location details with schema markup */}
              <section className={styles.propertyCard} itemScope itemType="https://schema.org/PostalAddress">
                <h3 className={styles.propertyCardTitle}>Location Details</h3>
                <div className={styles.propertyCardContent}>
                  <p className={styles.propertyCardText}>
                    <span itemProp="streetAddress">{property.address}</span>, 
                    <span itemProp="addressLocality"> {property.city}</span>, 
                    <span itemProp="addressRegion"> {property.state}</span>, 
                    <span itemProp="addressCountry"> {property.country}</span>
                  </p>
                </div>
              </section>

              {/* Policies section */}
              <section className={styles.propertyCard}>
                <h3 className={styles.propertyCardTitle}>House Rules & Policies</h3>
                <div className={styles.propertyCardContent}>
                  {property.policies && Object.entries(property.policies).map(([policy, description]) => (
                    <div key={policy} className={styles.propertyCardItem}>
                      <p className={styles.propertyCardText}>
                        <strong>{policy.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </article>
            
            {/* Booking component - Right side */}
            <aside>
              <BookingComponent 
                propertyId={propertyId}
                maxGuest={property.maxGuest}
                minNight={property.minNight}
                maxNight={property.maxNight}
              />
            </aside>
          </div>
          
          {/* Reviews section */}
          <section>
            <PropertyReview propertyId={propertyId} />
          </section>
             
          {/* Map section with enhanced accessibility */}
          <section className={styles.mapContainer}>
            <h3 className={styles.locationTitle}>Property Location</h3>
            <div itemScope itemType="https://schema.org/GeoCoordinates">
              <MapComponent 
                address={`${property.address}, ${property.city}, ${property.country}`}
              />
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}