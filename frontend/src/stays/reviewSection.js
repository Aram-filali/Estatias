import { useState, useEffect, useRef, useCallback } from "react";

export default function ReviewSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [activeTestimonials, setActiveTestimonials] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewStats, setReviewStats] = useState({
    totalCount: 0,
    averageRating: 0,
    ratingDistribution: {}
  });
  const intervalRef = useRef(null);
  const sectionRef = useRef(null);

  // Get host UID from environment variables or context

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const HOST_UID = process.env.NEXT_PUBLIC_HOST_ID;

 
    console.log("Using hostId:", HOST_UID);

    if (!HOST_UID) {
      console.error("Host ID not found in environment variables");
      setLoading(false);
      return;
    }
  // Fetch reviews from API
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!HOST_UID) {
        throw new Error('Host UID not found in environment variables');
      }

      // Adjust the API URL to match your setup
      const response = await fetch(`${apiUrl}/properties/host/${HOST_UID}/reviews?page=1&limit=20`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.statusCode === 200 && data.data) {
        const { reviews: fetchedReviews, totalCount, averageRating, ratingDistribution } = data.data;
        
        // Transform backend data to match frontend structure
        const transformedReviews = fetchedReviews.map(review => ({
          quote: review.comment,
          name: review.userEmail.split('@')[0] || 'Anonymous', // Use email prefix as name
          title: review.propertyId?.name || 'Guest',
          avatar: '/default-avatar.jpg', // Default avatar since we don't have user avatars
          rating: review.rating,
          date: new Date(review.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          propertyName: review.propertyId?.name,
          propertyAddress: review.propertyId?.address
        }));

        setReviews(transformedReviews);
        setReviewStats({
          totalCount,
          averageRating,
          ratingDistribution
        });
      } else {
        throw new Error(data.error || 'Failed to fetch reviews');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err.message);
      // Fallback to empty array if fetch fails
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reviews on component mount
  useEffect(() => {
    fetchReviews();
  }, [HOST_UID]);

  useEffect(() => {
    const updateActiveTestimonials = () => {
      if (reviews.length === 0) return;

      const width = window.innerWidth;
      let itemsPerSlide = width >= 1200 ? 3 : width >= 768 ? 2 : 1;
      let groupedTestimonials = [];
      
      for (let i = 0; i < reviews.length; i += itemsPerSlide) {
        groupedTestimonials.push(reviews.slice(i, i + itemsPerSlide));
      }
      
      setActiveTestimonials(groupedTestimonials);
    };

    updateActiveTestimonials();
    window.addEventListener('resize', updateActiveTestimonials);
    return () => window.removeEventListener('resize', updateActiveTestimonials);
  }, [reviews]); 

  const nextSlide = useCallback(() => {
    setCurrentIndex(prevIndex => (prevIndex + 1) % activeTestimonials.length);
  }, [activeTestimonials.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prevIndex => (prevIndex - 1 + activeTestimonials.length) % activeTestimonials.length);
  }, [activeTestimonials.length]);

  useEffect(() => {
    if (isVisible && autoplay && activeTestimonials.length > 0) {
      intervalRef.current = setInterval(nextSlide, 6000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isVisible, autoplay, nextSlide, activeTestimonials.length]);

  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const isNowVisible = rect.top < window.innerHeight * 0.8;
        setIsVisible(isNowVisible);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = () => autoplay && clearInterval(intervalRef.current);
  const handleMouseLeave = () => isVisible && autoplay && activeTestimonials.length > 0 && (intervalRef.current = setInterval(nextSlide, 6000));

  // Loading state
  if (loading) {
    return (
      <section className="testimonials-section" ref={sectionRef}>
        <div className="testimonials-container">
          <h2 className={`section-title ${isVisible ? "visible" : ""}`}>Guests Feedback</h2>
          <div className="loading-spinner">
            <p>Loading reviews...</p>
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="testimonials-section" ref={sectionRef}>
        <div className="testimonials-container">
          <h2 className={`section-title ${isVisible ? "visible" : ""}`}>Guests Feedback</h2>
          <div className="error-message">
            <p>Unable to load reviews: {error}</p>
            <button onClick={fetchReviews} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  // No reviews state
  if (reviews.length === 0) {
    return (
      <section className="testimonials-section" ref={sectionRef}>
        <div className="testimonials-container">
          <h2 className={`section-title ${isVisible ? "visible" : ""}`}>Guests Feedback</h2>
          <p className={`section-description ${isVisible ? "visible" : ""}`}>
            No reviews available yet. Be the first to leave a review!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="testimonials-section" ref={sectionRef}>
      <div className="testimonials-container">
        <h2 className={`section-title ${isVisible ? "visible" : ""}`}>Guests Feedback</h2>
        <p className={`section-description ${isVisible ? "visible" : ""}`}>
          {reviewStats.totalCount} reviews • {reviewStats.averageRating}★ average rating
        </p>

        <div className="testimonials-slider" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div 
            className="testimonials-track" 
            style={{ 
              transform: `translateX(-${currentIndex * 100}%)`, 
              transition: "transform 0.8s ease-in-out" 
            }}
          >
            {activeTestimonials.map((group, index) => (
              <div className="testimonial-slide" key={index}>
                {group.map((testimonial, idx) => (
                  <div className="testimonial-content" key={idx}>
                    <div className="testimonial-card">
                      <div className="testimonial-rating">
                        {[...Array(5)].map((_, i) => (
                          <span 
                            key={i} 
                            className={i < testimonial.rating ? "star-filled" : "star-empty"}
                          >
                            ★
                          </span>
                        ))}
                        <span className="review-date">{testimonial.date}</span>
                      </div>
                      <blockquote>
                        <p className="testimonial-quote">"{testimonial.quote}"</p>
                      </blockquote>
                      <div className="testimonial-author">
                        <img 
                          src={testimonial.avatar} 
                          alt={testimonial.name} 
                          className="author-avatar" 
                          onError={(e) => (e.target.src = '/default-avatar.jpg')} 
                        />
                        <div className="author-info">
                          <h3 className="author-name">{testimonial.name}</h3>
                          <p className="author-title">
                            {testimonial.propertyName || testimonial.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {activeTestimonials.length > 1 && (
          <div className="testimonial-dots">
            {activeTestimonials.map((_, i) => (
              <button 
                key={i} 
                className={`dot ${i === currentIndex ? "active" : ""}`} 
                onClick={() => setCurrentIndex(i)} 
              />
            ))}
          </div>
        )}

        {/* Optional: Add navigation arrows for better UX */}
        {activeTestimonials.length > 1 && (
          <div className="testimonial-navigation">
            <button 
              className="nav-button prev" 
              onClick={prevSlide}
              aria-label="Previous reviews"
            >
              ←
            </button>
            <button 
              className="nav-button next" 
              onClick={nextSlide}
              aria-label="Next reviews"
            >
              →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}