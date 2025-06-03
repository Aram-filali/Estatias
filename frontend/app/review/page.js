"use client";
import React, { useState } from 'react';
import styles from './TestimonailSection.module.css';
import Image from 'next/image';

const testimonials = [
  {
    id: 1,
    name: 'Ralph Edwards',
    role: 'Property Expert',
    image: '/ralph-edwards.jpg',
    quote: 'A home that perfectly blends sustainability with luxury until I discovered Ecoland Residence. I knew it was where I wanted to live. The commitment to living, coupled with modern amenities, is truly commendable.',
    rating: 5
  },
  {
    id: 2,
    name: 'Rosey Simon',
    role: 'Property Expert',
    image: '/aram-filali.jpg',
    quote: 'A home that perfectly blends sustainability with luxury until I discovered Ecoland Residence. I knew it was where I wanted to live. The commitment to living, coupled with modern amenities, is truly commendable.',
    rating: 5
  },
  {
    id: 3,
    name: 'Andrew Simon',
    role: 'Property Expert',
    image: '/andrew-simon.jpg',
    quote: 'A home that perfectly blends sustainability with luxury until I discovered Ecoland Residence. I knew it was where I wanted to live. The commitment to living, coupled with modern amenities, is truly commendable.',
    rating: 5
  },
  {
    id: 4,
    name: 'Andrew Simon',
    role: 'Property Expert',
    image: '/andrew-simon.jpg',
    quote: 'A home that perfectly blends sustainability with luxury until I discovered Ecoland Residence. I knew it was where I wanted to live. The commitment to living, coupled with modern amenities, is truly commendable.',
    rating: 5
  },
  {
    id: 5,
    name: 'Ralph Edwards',
    role: 'Property Expert',
    image: '/ralph-edwards.jpg',
    quote: 'A home that perfectly blends sustainability with luxury until I discovered Ecoland Residence. I knew it was where I wanted to live. The commitment to living, coupled with modern amenities, is truly commendable.',
    rating: 5
  },
  {
    id: 6,
    name: 'Rosey Simon',
    role: 'Property Expert',
    image: '/aram-filali.jpg',
    quote: 'A home that perfectly blends sustainability with luxury until I discovered Ecoland Residence. I knew it was where I wanted to live. The commitment to living, coupled with modern amenities, is truly commendable.',
    rating: 5
  },
  
];

const TestimonialSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const displayTestimonials = () => {
    const startIndex = currentIndex;
    const endIndex = Math.min(startIndex + 3, testimonials.length);
    return testimonials.slice(startIndex, endIndex);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(prev + 1, testimonials.length - 3));
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, index) => (
      <span key={index} className={styles.star}>
        {index < rating ? '★' : '☆'}
      </span>
    ));
  };

  return (
    <section className={styles.testimonialSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2>TESTIMONIAL</h2>
          <h1 className={styles.sectionTitle}>Client FeedBack</h1>
        </div>

        <div className={styles.testimonialsContainer}>
          {displayTestimonials().map((testimonial) => (
            <div key={testimonial.id} className={styles.testimonialCard}>
              <div className={styles.imageContainer}>
                <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                  width={150}
                  height={180}
                  className={styles.profileImage}
                />
              </div>
              <div className={styles.testimonialContent}>
                <div className={styles.quoteMark}>&ldquo; &rdquo;</div>
                <h3 className={styles.name}>{testimonial.name}</h3>
                <p className={styles.role}>{testimonial.role}</p>
                <p className={styles.quote}>&ldquo;{testimonial.quote}&rdquo;</p>
                <div className={styles.rating}>
                  {renderStars(testimonial.rating)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.navigationButtons}>
          <button 
            className={styles.navButton} 
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            &#8592;
          </button>
          <button 
            className={styles.navButton} 
            onClick={handleNext}
            disabled={currentIndex >= testimonials.length - 3}
          >
            &#8594;
          </button>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;