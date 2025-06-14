// src/components/ImageGallery.js
"use client";

import React, { useState, useEffect } from 'react';
import styles from '../../styles/propertyDetails.module.css';

export default function ImageGallery({ photos, propertyTitle }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [failedImages, setFailedImages] = useState(new Set());

  const prevImage = () => {
    if (!photos?.length) return;
    setCurrentImageIndex(prev => 
      prev === 0 ? photos.length - 1 : prev - 1
    );
  };

  const nextImage = () => {
    if (!photos?.length) return;
    setCurrentImageIndex(prev => 
      prev === photos.length - 1 ? 0 : prev + 1
    );
  };

  // Auto-advance slideshow
  useEffect(() => {
    if (!photos?.length) return;
    const intervalId = setInterval(nextImage, 5000);
    return () => clearInterval(intervalId);
  }, [currentImageIndex, photos]);

  const handleImageLoad = (index) => {
    setLoadedImages(prev => new Set(prev).add(index));
  };

  const handleImageError = (index) => {
    setFailedImages(prev => new Set(prev).add(index));
    console.log(`Image ${index} failed to load:`, photos[index]);
  };

  if (!photos || photos.length === 0) {
    return (
      <div className={styles.containerr}>
        <div className={styles.sliderContainer} style={{
          maxWidth: '1200px',
          height: '400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0'
        }}>
          <p>No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.containerr}>
      {/* Main Slider */}
      <div className={styles.sliderContainer} style={{
        maxWidth: '800px',
        height: '400px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px'
      }}>
        <div
          className={styles.slider}
          style={{
            transform: `translateX(-${currentImageIndex * 100}%)`,
            height: '100%',
            display: 'flex',
            transition: 'transform 0.3s ease-in-out'
          }}
        >
          {photos.map((img, index) => (
            <div key={index} style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5'
            }}>
              {!failedImages.has(index) ? (
                <img
                  src={img}
                  alt={`${propertyTitle} - Image ${index + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center'
                  }}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                />
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  textAlign: 'center',
                  padding: '20px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
                  <p>Image unavailable</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Thumbnail Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '20px',
        gap: '15px'
      }}>
        <button 
          onClick={prevImage}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#4b5563',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#ffffff';
            e.target.style.color = '#10b981';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            e.target.style.color = '#4b5563';
            e.target.style.transform = 'scale(1)';
          }}
        >
          ←
        </button>

        {/* Thumbnails Container */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '10px 0',
          maxWidth: '600px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db transparent'
        }}>
          {photos.map((img, index) => (
            <div
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              style={{
                width: '80px',
                height: '60px',
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: index === currentImageIndex ? '3px solid #10b981' : '2px solid transparent',
                flexShrink: 0,
                backgroundColor: '#f5f5f5',
                transition: 'all 0.3s ease',
                opacity: index === currentImageIndex ? 1 : 0.7,
                transform: index === currentImageIndex ? 'scale(1.05)' : 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (index !== currentImageIndex) {
                  e.target.style.opacity = '0.9';
                  e.target.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (index !== currentImageIndex) {
                  e.target.style.opacity = '0.7';
                  e.target.style.transform = 'scale(1)';
                }
              }}
            >
              {!failedImages.has(index) ? (
                <img
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: '#999'
                }}>
                  📷
                </div>
              )}
              
              {/* Image number overlay */}
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontSize: '10px',
                borderRadius: '3px',
                padding: '1px 3px',
                lineHeight: '1'
              }}>
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={nextImage}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#4b5563',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#ffffff';
            e.target.style.color = '#10b981';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            e.target.style.color = '#4b5563';
            e.target.style.transform = 'scale(1)';
          }}
        >
          →
        </button>
      </div>

      {/* Image counter */}
      <div style={{
        textAlign: 'center',
        marginTop: '15px',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        {currentImageIndex + 1} of {photos.length}
      </div>
    </div>
  );
}