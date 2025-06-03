"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HeroSection from './heroSection';
import ReviewSection from './reviewSection';
import PropertyFilter from './filter'; 
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import axios from 'axios';

const PropertyImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <img
      className={className}
      src={imgSrc || '/default-property.jpg'}
      alt={alt}
      onError={() => setImgSrc('/default-property.jpg')}
    />
  );
};

export default function Home() {
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [guestCount, setGuestCount] = useState(1);
  const [filteredProperties, setFilteredProperties] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostData, setHostData] = useState(null);
  
  const controls = useAnimation();
  const { ref, inView } = useInView({
    triggerOnce: false,
    threshold: 0.2,
  });

  const router = useRouter();

  const [typedText, setTypedText] = useState("");
  const typedWords = "Indulge in Unmatched Luxury at RESA, <br />Where Every Moment <br />Feels Like a Dream";
  const speed = 100;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const heroImages = [
    '/luxury-property.jpg',
    '/luxury-villa.jpg', 
    '/modern-villa.jpg',
    '/luxury-luxury.jpg'
  ];

  useEffect(() => {
    if (inView) {
      controls.start({ opacity: 1, y: 0 });
    } else {
      controls.start({ opacity: 0, y: 50 });
    }
  }, [controls, inView]);

  useEffect(() => {
    let index = 0;
    setTypedText("");
    let typeTimeout;

    const type = () => {
      if (index < typedWords.length) {
        setTypedText(typedWords.substring(0, index + 1));
        index++;
        typeTimeout = setTimeout(type, speed);
      }
    };

    type();

    return () => {
      if (typeTimeout) clearTimeout(typeTimeout);
      setTypedText("");
    };
  }, []);


  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Load properties when component mounts
  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      // Get host ID from environment variable
      const hostId = process.env.NEXT_PUBLIC_HOST_ID;
      
      if (!hostId) {
        console.error("Host ID not found in environment variables");
        setLoading(false);
        return;
      }
      
      // Make API call to get properties by host ID
      const response = await axios.get(`http://localhost:3000/properties/host/${hostId}`);
      setProperties(response.data || []);
      setLoading(false);
      
    } catch (error) {
      console.error("Error loading properties:", error);
      setProperties([]);
      setLoading(false);
    }
  };

  const handleViewDetails = (propertyId) => {
    router.push(`/propertyDetails/${propertyId}`);
  };

  const handleFilterChange = (filterType) => {
    if (!filterType) {
      setFilteredProperties(null);
      return;
    }
    
    const filtered = properties.filter(property => property.type === filterType);
    setFilteredProperties(filtered);
  };

  // Ensure displayProperties is always an array
  const displayProperties = Array.isArray(filteredProperties) ? filteredProperties : Array.isArray(properties) ? properties : [];

  return (
    <>
      {loading ? (
        <div className="loading-spinner"></div>
      ) : (
        <>
          <HeroSection
            properties={properties}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            guestCount={guestCount}
            hostData={hostData}
          />

          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={controls}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="property-listings-section"
          >
            <div className="section-header">
              <h2 className="section-titleee">Property Listings</h2>
              <p className="section-subtitle">
                Discover our exclusive properties in the best destinations.
              </p>
            </div>
            
            <PropertyFilter onFilterChange={handleFilterChange} />
          
            <div className="properties-grid">
              {displayProperties.length > 0 ? (
                displayProperties.map((property) => (
                  <div key={property._id || property.id} className="property-card">
                    <div className="property-image-container">
                      <PropertyImage 
                        src={property.mainPhotos?.[0]} 
                        alt={property.title} 
                        className="property-image"
                      />
                      <div className="property-price">${property.price}/night</div>
                    </div>
                    <div className="property-content">
                      <h3 className="property-titlee">{property.title}</h3>
                      <p className="property-location">{property.city}, {property.country}</p>

                      <div className="property-footer">
                        
                        <button 
                          className="view-button" 
                          onClick={() => handleViewDetails(property._id || property.id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-properties-message">
                  No properties listed yet.
                </div>
              )}
            </div>
          </motion.div>

          <ReviewSection />
        </>
      )}
    </>
  );
}