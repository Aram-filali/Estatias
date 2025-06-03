import { useState, useEffect } from 'react';
import axios from 'axios';

export default function HeroSection() {
  // State for slider images and texts
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [animationReady, setAnimationReady] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Default hero content in case there are no properties
  const defaultHeroContent = [
    {
      images: ['/maison-1.jpg'], // Fallback image
      title: {
        top: "Discover Your",
        bottom: "Flexible Living"
      },
      subtitle: "Bringing together a team with passion, dedication, and resources to help our clients reach their buying and selling goals."
    }
  ];

  // Fetch properties photos on component mount
  useEffect(() => {
    const fetchPropertyPhotos = async () => {
      try {
        setLoading(true);
        // Get host ID from environment variable
        const hostId = process.env.NEXT_PUBLIC_HOST_ID;
        
        if (!hostId) {
          console.error("Host ID not found in environment variables");
          setLoading(false);
          setError("Host ID not configured. Please check your environment variables.");
          return;
        }
        
        // Make API call with the correct parameter in the URL
        const response = await axios.get(`http://localhost:3000/properties/photos/${hostId}`);
        
        // Process the response data
        const propertiesData = response.data;
        
        if (Array.isArray(propertiesData) && propertiesData.length > 0) {
          // Filter properties with photos
          const propertiesWithPhotos = propertiesData.filter(
            property => property.mainPhotos && property.mainPhotos.length > 0
          );
          
          if (propertiesWithPhotos.length > 0) {
            console.log('Loaded property photos:', propertiesWithPhotos);
            // Log total number of photos across all properties
            const totalPhotos = propertiesWithPhotos.reduce(
              (sum, property) => sum + (property.mainPhotos?.length || 0), 0
            );
            console.log(`Total number of photos loaded: ${totalPhotos}`);
            setProperties(propertiesWithPhotos);
          } else {
            console.warn('No properties with photos found');
            // Still using default content here
          }
        } else {
          console.warn('No property data returned from API');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching property photos:', err);
        
        // More detailed error handling
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Response error data:', err.response.data);
          console.error('Response error status:', err.response.status);
          setError(`Server error: ${err.response.status}`);
        } else if (err.request) {
          // The request was made but no response was received
          console.error('Request made but no response received');
          setError('No response from server. Please check your connection.');
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error message:', err.message);
          setError(`Request error: ${err.message}`);
        }
        
        setLoading(false);
      }
    };
    
    fetchPropertyPhotos();
  }, []);

  // Generate hero slides from properties or use defaults
  const heroSlides = properties.length > 0 
    ? properties.flatMap(property => 
        // Create a slide for each photo in mainPhotos
        property.mainPhotos && property.mainPhotos.length > 0 
          ? property.mainPhotos.map(photo => ({
              images: [photo], // Use individual photo
              title: {
                // Split title into two parts
                top:  "Premium",
                bottom:  "Real Estate"
              },
              subtitle: "Discover exceptional properties curated for your next home or investment."
            }))
          : [] // Skip properties without photos
      )
    : defaultHeroContent;

  // Ensure that UI is styled immediately but animations start only after a small delay
  useEffect(() => {
    // Short delay to ensure CSS has loaded before starting animations
    const timer = setTimeout(() => {
      setAnimationReady(true);
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  // Slider rotation and reset animation state
  useEffect(() => {
    if (heroSlides.length <= 1) return; // Don't rotate if there's only one slide
    
    const interval = setInterval(() => {
      // Reset animation before changing image
      setAnimationReady(false);
      
      // Small delay before changing index so animation can reset
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) =>
          prevIndex === heroSlides.length - 1 ? 0 : prevIndex + 1
        );
        
        // Reactivate animation after image change
        setTimeout(() => {
          setAnimationReady(true);
        }, 50);
      }, 100);
      
    }, 5000); // Change slides every 5 seconds (reduced from 7 seconds for better viewing of multiple photos)
    
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Custom error display
  if (error) {
    return (
      <div className="hero-section">
        <div className="hero-error">
          <h2>We're having trouble loading properties</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="explore-button"
          >
            <span>Refresh Page</span>
          </button>
        </div>
        
        {/* Add the default background when there's an error */}
        <div 
          className="hero-slide active"
          style={{
            backgroundImage: `url(${defaultHeroContent[0].images[0]})`,
            opacity: 1,
          }}
        ></div>
        <div className="overlay"></div>
      </div>
    );
  }

  return (
    <div className="hero-section">
      {loading ? (
        <div className="hero-loading">
          <div className="loading-spinner"></div>
          <p>Loading properties...</p>
        </div>
      ) : (
        <>
          {/* Hero slider */}
          <div className="hero-slider">
            {heroSlides.map((slide, index) => (
              <div 
                key={index}
                className={`hero-slide ${index === currentImageIndex ? 'active' : ''}`}
                style={{
                  // Use the image directly since we now have one image per slide
                  backgroundImage: `url(${slide.images[0] || '/placeholder.jpg'})`,
                  opacity: index === currentImageIndex ? 1 : 0,
                }}
              ></div>
            ))}
          </div>
          
          <div className="hero-frame"></div>
          <div className="overlay"></div>
          <div className="subtle-borders"></div>
          
          <div className="hero-content">
            <div className="hero-text">
              {/* Always rendered but animations start after delay */}
              <div className={`split-animation-container ${animationReady ? 'ready' : ''}`}>
                <div className="split-text split-top">
                  {heroSlides[currentImageIndex].title.top}
                </div>
                <div className="split-text split-bottom">
                  {heroSlides[currentImageIndex].title.bottom}
                </div>
              </div>
              
              <p className={`hero-subtitle ${animationReady ? 'ready' : ''}`}>
                {heroSlides[currentImageIndex].subtitle}
              </p>
              
              <div className={`button-container ${animationReady ? 'ready' : ''}`}>
                <a href="#properties" className="explore-button">
                  <span>Explore Properties</span>
                </a>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Style is now directly embedded without jsx for better reliability */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hero section styles - visible immediately */
        .hero-section {
          position: relative;
          height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          margin-top: 59px;
          padding-top: 10px;
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
        }
        
        /* Loading state styling */
        .hero-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
          color: #fff;
          background: radial-gradient(
            circle at center,
            rgba(48, 55, 75, 0.85) 0%,
            rgba(0, 0, 0, 0.9) 100%
          );
          z-index: 10;
        }
        
        /* Error state styling */
        .hero-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
          color: #fff;
          background: rgba(0, 0, 0, 0.7);
          z-index: 10;
          padding: 2rem;
          text-align: center;
        }
        
        .hero-error h2 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        
        .hero-error p {
          margin-bottom: 2rem;
          max-width: 600px;
        }
        
        .loading-spinner {
          border: 5px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top: 5px solid #fff;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Hero slider and slides */
        .hero-slider {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          padding: 20px;
          box-sizing: border-box;
        }
        
        .hero-slide {
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          bottom: 20px;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transition: opacity 1.5s ease-in-out;
          filter: brightness(0.85) contrast(1.1) saturate(1.2);
          box-shadow: 
            0 0 20px rgba(37, 41, 56, 0.62),
            inset 0 0 100px rgba(137, 159, 205, 0.55);
          clip-path: polygon(
            0% 5%, 5% 0%, 95% 0%, 100% 5%, 
            100% 95%, 95% 100%, 5% 100%, 0% 95%
          );
        }
        
        /* Decorative frame */
        .hero-frame {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          pointer-events: none;
          border: 10px double rgba(48, 55, 75, 0.55);
          margin: 25px;
          box-shadow: 
            inset 0 0 10px rgba(48, 55, 75, 0.55),
            0 0 20px rgba(48, 55, 75, 0.55);
        }
        
        .hero-slide.active {
          opacity: 1;
          animation: slowZoom 8s ease-in-out forwards;
        }
        
        @keyframes slowZoom {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        
        /* Enhanced overlay */
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            circle at center,
            rgba(0, 0, 0, 0.2) 0%,
            rgba(0, 0, 0, 0.5) 70%,
            rgba(0, 0, 0, 0.7) 100%
          );
          z-index: 5;
        }
        
        /* Subtle gradient border - visible immediately */
        .subtle-borders {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 6;
          pointer-events: none;
          box-shadow: inset 0 0 80px 10px rgba(48, 55, 75, 0.55);
          border-radius: 3px;
          opacity: 0.8;
        }
        
        /* Hero content - visible immediately */
        .hero-content {
          position: relative;
          z-index: 20;
          text-align: center;
          width: 100%;
          max-width: 1200px;
          padding: 0 2rem;
        }
        
        .hero-text {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100vh;
        }
        
        /* Split animation container */
        .split-animation-container {
          position: relative;
          height: 200px;
          width: 100%;
          overflow: hidden;
          margin-bottom: 20px;
        }
        
        /* Text is visible immediately with basic styling */
        .split-text {
          position: absolute;
          left: 0;
          width: 100%;
          font-size: 4rem;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
          white-space: nowrap;
          opacity: 0.2; /* Slightly visible by default */
        }
        
        .split-top {
          top: 0;
          transform: translateY(100px);
        }
        
        .split-bottom {
          bottom: 0;
          transform: translateY(-100px);
        }
        
        /* Animations only start when container is ready */
        .split-animation-container.ready .split-top {
          animation: moveDownIn 1.5s forwards;
        }
        
        .split-animation-container.ready .split-bottom {
          animation: moveUpIn 1.5s forwards 0.3s;
        }
        
        @keyframes moveDownIn {
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes moveUpIn {
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        /* Subtitle - visible but faded initially */
        .hero-subtitle {
          max-width: 36rem;
          font-size: calc(1rem + 0.25vw);
          margin: 2.5rem auto;
          color: white;
          opacity: 0.2;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .hero-subtitle.ready {
          animation: fadeIn 1.5s forwards;
        }
        
        @keyframes fadeIn {
          0% { opacity: 0.2; }
          100% { opacity: 1; }
        }
        
        /* Explore button - visible but faded initially */
        .button-container {
          margin-top: 2rem;
          opacity: 0.2;
        }
        
        .button-container.ready {
          animation: fadeIn 1.5s forwards;
        }
        
        .explore-button {
          position: relative;
          display: inline-block;
          padding: 1.2rem 2.4rem;
          background-color: rgb(237, 237, 237);
          color: black;
          font-weight: 500;
          font-size: 1.125rem;
          text-decoration: none;
          overflow: hidden;
          transition: all 0.4s ease;
          border: 1px solid rgba(153, 150, 150, 0.5);
          border-radius: 4px;
          backdrop-filter: blur(4px);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2);
        }
        
        .explore-button:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgb(87, 88, 91),
            transparent
          );
          transition: all 0.6s ease;
        }
        
        .explore-button:hover {
          background-color: rgba(255, 255, 255, 1);
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          color: black;
          border-radius: 25px;
          padding: 1.2rem 2.6rem;
        }
        
        .explore-button:hover:before {
          left: 100%;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .split-text {
            font-size: 2.5rem;
          }
          
          .split-animation-container {
            height: 150px;
          }
          
          .hero-slide {
            clip-path: polygon(
              0% 3%, 3% 0%, 97% 0%, 100% 3%, 
              100% 97%, 97% 100%, 3% 100%, 0% 97%
            );
          }
        }
      `}} />
    </div>
  );
}