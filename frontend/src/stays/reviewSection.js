import { useState, useEffect, useRef, useCallback } from "react";

export default function ReviewSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [activeTestimonials, setActiveTestimonials] = useState([]);
  const intervalRef = useRef(null);
  const sectionRef = useRef(null);

const testimonials = [
  { 
    quote: "Our stay at this property was absolutely magical! The host was so attentive and the house was perfectly equipped. We'll definitely be back!", 
    name: "Aram Filali", 
    title: " ", 
    avatar: "/aram-filali.jpg", 
    rating: 5, 
    date: "January 28, 2025" 
  },
  { 
    quote: "An unforgettable experience! The view from the terrace was breathtaking, and our host's warm welcome made our weekend perfect.", 
    name: "Andrew Simon", 
    title: " ", 
    avatar: "/andrew-simon.jpg", 
    rating: 5, 
    date: "February 2, 2025" 
  },
  { 
    quote: "Very good stay overall. The property was clean and well located, though a few small details could be improved. Would recommend!", 
    name: "Soumaya Ayadi", 
    title: " ", 
    avatar: "/soumaya.jpg", 
    rating: 4, 
    date: "February 10, 2025" 
  },
  { 
    quote: "Dream vacation! Our kids loved the pool and we appreciated the peaceful neighborhood. The host was always available for our questions.", 
    name: "Mohamed Taha", 
    title: "Family with children", 
    avatar: "/mohamed-taha.jpeg", 
    rating: 5, 
    date: "March 15, 2025" 
  },
  { 
    quote: "This property exceeded all our expectations! The layout was perfect for our group of friends, and the location ideal for exploring the area.", 
    name: "Emma Johnson", 
    title: "Friends group", 
    avatar: "/emma-johnson.jpg", 
    rating: 5, 
    date: "January 15, 2025" 
  },
  { 
    quote: "Very pleasant stay with excellent communication from the host. The house was exactly as shown in the photos, very well maintained.", 
    name: "David Chen", 
    title: "Business stay", 
    avatar: "/ralph-edwards.jpg", 
    rating: 4, 
    date: "December 30, 2024" 
  },
  { 
    quote: "We had a wonderful week! The kitchen was perfectly equipped for family cooking, and the garden provided an ideal relaxation space.", 
    name: "Sarah Miller", 
    title: "Family vacation", 
    avatar: "/ralph-edwards.jpg", 
    rating: 5, 
    date: "December 12, 2024" 
  },
  { 
    quote: "Excellent value for money! The property was comfortable, well located near tourist attractions, and the host's welcome was perfect.", 
    name: "James Wilson", 
    title: "Romantic weekend", 
    avatar: "/james-wilson.jpg", 
    rating: 4, 
    date: "November 25, 2024" 
  }
];

  useEffect(() => {
    const updateActiveTestimonials = () => {
      const width = window.innerWidth;
      let itemsPerSlide = width >= 1200 ? 3 : width >= 768 ? 2 : 1;
      let groupedTestimonials = [];
      for (let i = 0; i < testimonials.length; i += itemsPerSlide) {
        groupedTestimonials.push(testimonials.slice(i, i + itemsPerSlide));
      }
      setActiveTestimonials(groupedTestimonials);
    };

    updateActiveTestimonials();
    window.addEventListener('resize', updateActiveTestimonials);
    return () => window.removeEventListener('resize', updateActiveTestimonials);
  }, []); 

  const nextSlide = useCallback(() => {
    setCurrentIndex(prevIndex => (prevIndex + 1) % activeTestimonials.length);
  }, [activeTestimonials.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prevIndex => (prevIndex - 1 + activeTestimonials.length) % activeTestimonials.length);
  }, [activeTestimonials.length]);

  useEffect(() => {
    if (isVisible && autoplay) {
      intervalRef.current = setInterval(nextSlide, 6000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isVisible, autoplay, nextSlide]);

  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const isNowVisible = rect.top < window.innerHeight * 0.8;
        console.log("Section visible:", isNowVisible);
        setIsVisible(isNowVisible);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = () => autoplay && clearInterval(intervalRef.current);
  const handleMouseLeave = () => isVisible && autoplay && (intervalRef.current = setInterval(nextSlide, 6000));

  return (
    <section className="testimonials-section" ref={sectionRef}>
      <div className="testimonials-container">
            <h2 className={`section-title ${isVisible ? "visible" : ""}`}>Guests Feedback</h2>
            <p className={`section-description ${isVisible ? "visible" : ""}`}>
            Take a look at what Our guests are saying
            </p>

        <div className="testimonials-slider" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div className="testimonials-track" style={{ transform: `translateX(-${currentIndex * 100}%)`, transition: "transform 0.8s ease-in-out" }}>
            {activeTestimonials.map((group, index) => (
              <div className="testimonial-slide" key={index}>
                {group.map((testimonial, idx) => (
                  <div className="testimonial-content" key={idx}>
                    <div className="testimonial-card">
                      <div className="testimonial-rating">
                        {[...Array(5)].map((_, i) => <span key={i} className={i < testimonial.rating ? "star-filled" : "star-empty"}>★</span>)}
                        <span className="review-date">{testimonial.date}</span>
                      </div>
                      <blockquote><p className="testimonial-quote">"{testimonial.quote}"</p></blockquote>
                      <div className="testimonial-author">
                        <img src={testimonial.avatar} alt={testimonial.name} className="author-avatar" onError={(e) => (e.target.src = '/default-avatar.jpg')} />
                        <div className="author-info"><h3 className="author-name">{testimonial.name}</h3><p className="author-title">{testimonial.title}</p></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="testimonial-dots">
          {activeTestimonials.map((_, i) => <button key={i} className={`dot ${i === currentIndex ? "active" : ""}`} onClick={() => setCurrentIndex(i)} />)}
        </div>
      </div>
    </section>
  );
}