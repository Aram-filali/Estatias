//app/propertydetails/[id]/page.js
import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import MapComponent from 'src/components/Map';
import PropertyReview from '@/src/components/review/PropertyReview';
import BookingComponent from 'src/components/bookingComponent';
import ImageGallery from 'src/components/ImageGallery';
import styles from '../../../styles/propertyDetails.module.css';

// Server-side function to fetch property data
async function getProperty(id) {
  try {
    console.log("Fetching property with ID:", id);
    
    // In production, use environment variable or config
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/properties/${id}`, {
      // Add cache revalidation if needed
      next: { revalidate: 3600 } // Revalidate every hour
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data) {
      throw new Error("No data received");
    }
    
    return data;
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}

// Generate structured data for SEO
function generateStructuredData(property) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://yoursite.com" || "https://localhost:3002";
  
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": property.title,
    "description": property.description,
    "url": `${baseUrl}/propertydetails/${property.id}`,
    "image": property.mainPhotos?.map(photo => `${baseUrl}${photo}`) || [],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": property.address,
      "addressLocality": property.city,
      "addressRegion": property.state,
      "addressCountry": property.country
    },
    "geo": property.coordinates ? {
      "@type": "GeoCoordinates",
      "latitude": property.coordinates.lat,
      "longitude": property.coordinates.lng
    } : undefined,
    "amenityFeature": property.amenities ? Object.entries(property.amenities)
      .filter(([_, available]) => available)
      .map(([amenity, _]) => ({
        "@type": "LocationFeatureSpecification",
        "name": amenity
      })) : [],
    "numberOfRooms": property.bedrooms,
    "occupancy": {
      "@type": "QuantitativeValue",
      "maxValue": property.maxGuest
    },
    "floorSize": property.size ? {
      "@type": "QuantitativeValue",
      "value": property.size,
      "unitCode": "MTK"
    } : undefined,
    "aggregateRating": property.rating ? {
      "@type": "AggregateRating",
      "ratingValue": property.rating,
      "reviewCount": property.reviewCount || 0
    } : undefined,
    "priceRange": property.priceRange || "$$"
  };
}

// Generate SEO metadata
export async function generateMetadata({ params }) {
  const { id } = await params;
  const property = await getProperty(id);
  
  if (!property) {
    return {
      title: 'Property Not Found | Estatias',
      description: 'The requested property could not be found.'
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://yoursite.com" || "https://localhost:3002";
  const propertyUrl = `${baseUrl}/propertydetails/${id}`;
  
  // Create rich, keyword-optimized title and description
  const seoTitle = `${property.title} - ${property.bedrooms} Bed ${property.city} Rental | Book Now | Estatias`;
  const seoDescription = `Book ${property.title} in ${property.city}, ${property.country}. ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms, sleeps ${property.maxGuest}. ${property.size}m² with premium amenities. Best rates guaranteed. ${property.description?.substring(0, 100)}...`;
  
  const keywords = [
    property.city,
    property.country,
    property.state,
    `${property.bedrooms} bedroom rental`,
    `${property.bedrooms} bed apartment`,
    `accommodation ${property.city}`,
    `vacation rental ${property.city}`,
    `holiday rental ${property.city}`,
    `short term rental ${property.city}`,
    `${property.city} accommodation`,
    `book ${property.city}`,
    `rent ${property.city}`,
    property.title.split(' ').filter(word => word.length > 3),
    ...(property.amenities ? Object.keys(property.amenities).filter(amenity => property.amenities[amenity]) : [])
  ].filter(Boolean).join(', ');

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: keywords,
    authors: [{ name: 'Estatias' }],
    creator: 'Estatias',
    publisher: 'Estatias',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: propertyUrl,
      title: seoTitle,
      description: seoDescription,
      siteName: 'Estatias',
      images: [
        {
          url: property.mainPhotos?.[0] ? `${baseUrl}${property.mainPhotos[0]}` : `${baseUrl}/default-property.jpg`,
          width: 1200,
          height: 630,
          alt: `${property.title} - ${property.city} Accommodation`,
        },
        ...(property.mainPhotos?.slice(1, 4).map(photo => ({
          url: `${baseUrl}${photo}`,
          width: 800,
          height: 600,
          alt: `${property.title} interior`,
        })) || [])
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDescription,
      images: [property.mainPhotos?.[0] ? `${baseUrl}${property.mainPhotos[0]}` : `${baseUrl}/default-property.jpg`],
      creator: '@Estatias',
      site: '@Estatias',
    },
    alternates: {
      canonical: propertyUrl,
    },
    other: {
      'booking:type': 'property',
      'booking:property_id': property.id,
      'booking:city': property.city,
      'booking:country': property.country,
      'booking:bedrooms': property.bedrooms,
      'booking:max_guests': property.maxGuest,
    }
  };
}

export default async function PropertyDetails({ params }) {
  // Await params in server component
  const { id } = await params;
  
  // Fetch property data on the server
  const property = await getProperty(id);

  if (!property) {
    return (
      <div className={styles.bg}>
        <Head>
          <title>Property Not Found | Estatias</title>
          <meta name="description" content="The requested property could not be found. Browse our other amazing accommodations." />
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div className={styles.container}>
          <div className={styles.notFound}>Property not found</div>
        </div>
      </div>
    );
  }

  // Combine all photos for the gallery
  const allPhotos = [
    ...(property.mainPhotos || []),
    ...(property.apartmentSpaces?.flatMap(space => space.photos || []) || [])
  ];

  const structuredData = generateStructuredData(property);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://yoursite.com" || "https://localhost:3002";



 
  return (
    <div className={styles.bg}>
      <Head>
        {/* Favicon and App Icons */}
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Estatias" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        
        {/* Additional SEO Meta Tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="theme-color" content="#000000" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Preload critical resources */}
        {property.mainPhotos?.[0] && (
          <link rel="preload" as="image" href={`${baseUrl}${property.mainPhotos[0]}`} />
        )}
      </Head>
      
      <div className={styles.container}>
        {/* Breadcrumb Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": baseUrl
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": property.city,
                  "item": `${baseUrl}/city/${property.city.toLowerCase()}`
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": property.title,
                  "item": `${baseUrl}/propertydetails/${property.id}`
                }
              ]
            })
          }}
        />

        <section className={styles.propertySection}>
          <div className={styles.sectionGrid1}>
            <header>
              <h1 className={styles.sectionTitle}>
                {property.title} - Premium {property.bedrooms} Bedroom Accommodation in {property.city}
              </h1>
              <div className={styles.propertyMeta}>
                <span>{property.city}, {property.country}</span>
                {property.rating && (
                  <span>★ {property.rating} ({property.reviewCount || 0} reviews)</span>
                )}
              </div>
            </header>
          </div>
          
          {/* Property Image Gallery - Client Component */}
          <ImageGallery photos={allPhotos} propertyTitle={property.title} />
        </section>

        <section className={styles.propertySection}>
          <div className={styles.sectionGrid}>
            <article>
              <h2 className={styles.sectionTitle}>About This {property.bedrooms} Bedroom {property.city} Rental</h2>
              <div className={styles.sectionText}>
                <p>
                  {property.description}
                </p>
                <p>
                  Experience the best of {property.city} from this perfectly located {property.bedrooms}-bedroom, 
                  {property.bathrooms}-bathroom accommodation. Ideal for groups of up to {property.maxGuest} guests 
                  seeking comfort and convenience in {property.city}, {property.country}.
                </p>
              </div>
              
              <div className={styles.propertyHighlights}>
                <h3>Property Highlights</h3>
                <ul className={styles.propertyList}>
                  <li><span>✓</span> <span>{property.bedrooms} spacious bedrooms, {property.bathrooms} full bathrooms</span></li>
                  <li><span>✓</span> <span>Comfortably accommodates up to {property.maxGuest} guests</span></li>
                  {property.floorNumber != null && (
                    <li><span>✓</span> <span>Floor number: {property.floorNumber}</span></li>
                  )}
                  {property.lotSize != null && (
                    <li><span>✓</span> <span>Lot size: {property.lotSize} m²</span></li>
                  )}
                  <li><span>✓</span> <span>Total size: {property.size} m² of living space</span></li>
                  <li><span>✓</span> <span>Prime location in {property.city}</span></li>
                  <li><span>✓</span> <span>Minimum stay: {property.minNight} nights</span></li>
                </ul>
              </div>
              
              <div className={styles.amenitiesSection}>
                <h3 className={styles.featuresTitle}>Premium Amenities & Features</h3>
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
              </div>
              
              <div className={styles.propertyCard}>
                <h3 className={styles.propertyCardTitle}>Prime {property.city} Location</h3>
                <div className={styles.propertyCardContent}>
                  <p className={styles.propertyCardText}>
                    Located at {property.address}, {property.city}, {property.state}, {property.country}. 
                    This accommodation puts you in the heart of {property.city} with easy access to local 
                    attractions, dining, and transportation.
                  </p>
                </div>
              </div>

              

          <div className={styles.propertyCard}>
            <h3 className={styles.propertyCardTitle}>House Rules & Policies</h3>
            <div className={styles.propertyCardContent}>
              {/* Handle boolean policies */}
              {property.policies?.guests_allowed !== undefined && (
                <div className={styles.propertyCardItem}>
                  <p className={styles.propertyCardText}>
                    <strong>Additional Guests:</strong> {property.policies.guests_allowed ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>
              )}
              
              {property.policies?.parties_or_events !== undefined && (
                <div className={styles.propertyCardItem}>
                  <p className={styles.propertyCardText}>
                    <strong>Parties or Events:</strong> {property.policies.parties_or_events ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>
              )}
              
              {property.policies?.pets !== undefined && (
                <div className={styles.propertyCardItem}>
                  <p className={styles.propertyCardText}>
                    <strong>Pets:</strong> {property.policies.pets ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>
              )}
              
              {property.policies?.smoking !== undefined && (
                <div className={styles.propertyCardItem}>
                  <p className={styles.propertyCardText}>
                    <strong>Smoking:</strong> {property.policies.smoking ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>
              )}
              
              {/* Handle other non-boolean policies */}
              {property.policies && Object.entries(property.policies).map(([policy, value]) => {
                // Skip the boolean policies we've already handled
                if (['guest_allowed', 'parties_or_event', 'pets', 'smoking'].includes(policy)) {
                  return null;
                }
                
                return (
                  <div key={policy} className={styles.propertyCardItem}>
                    <p className={styles.propertyCardText}>
                      <strong>{policy.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {value}
                    </p>
                  </div>
                  );
                })}
              </div>
            </div>
            </article>
            
            {/* Booking component - Right side */}
            <aside>
              <BookingComponent 
                propertyId={property.id}
                maxGuest={property.maxGuest}
                minNight={property.minNight}
                maxNight={property.maxNight}
              />
            </aside>
          </div>
          
          <PropertyReview propertyId={property.id} />
             
          <div className={styles.mapContainer}>
            <h3 className={styles.locationTitle}>Explore {property.city} - Interactive Location Map</h3>
            <MapComponent 
              address={`${property.address}, ${property.city}, ${property.country}`}
            />
          </div>
        </section>
      </div>
    </div>
  );
};