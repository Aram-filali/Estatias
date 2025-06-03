"use client";

import Image from 'next/image';
import { useState } from 'react';
import styles from '../../styles/gallery.module.css';

export default function PropertyDetail() {
  const sliderContainer = document.querySelector('.sliderContainer');
const slider = document.querySelector('.slider');

sliderContainer.addEventListener('mousemove', (e) => {
    const { width } = sliderContainer.getBoundingClientRect();
    const mouseX = e.clientX;

    // Calcule le déplacement en fonction de la position de la souris
    const moveX = (mouseX / width) * 100;
    
    // Ajuste le déplacement pour un effet de glissement
    slider.style.transform = `translateX(-${moveX}%)`;
});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = [
    "/room-1.jpg",
    "/room-2.jpg", 
    "/room-3.jpg",
    "/room-4.jpg",
    "/room-1.jpg", 
    "/room-2.jpg"
  ];

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      (prevIndex + 1) % images.length
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.sliderContainer}>
      <div className={styles.slider}>
      <div className={styles.slide}>
          <div className={styles.mainImageWrapper}>
            <Image 
              src={images[currentImageIndex]} 
              alt="Property Detail" 
              layout="fill"
              objectFit="cover"
              className={styles.mainImage}
              priority
            />
            <button 
              onClick={prevImage} 
              className={styles.navButtonLeft}
            >
              ←
            </button>
            <button 
              onClick={nextImage} 
              className={styles.navButtonRight}
            >
              →
            </button>
          </div>
          <div className={styles.thumbnailContainer}>
            {images.map((img, index) => (
              <div 
                key={index}
                className={`${styles.thumbnail} ${
                  index === currentImageIndex ? styles.activeThumbnail : ''
                }`}
                onClick={() => setCurrentImageIndex(index)}
              >
                <Image 
                  src={img} 
                  alt={`Thumbnail ${index + 1}`}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}