"use client";
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import styles from './heroSection.module.css';
import { motion } from "framer-motion";

const HeroSection = ({ id }: { id?: string }) => {
  const router = useRouter();
  const propertyTypes = [
    'Vacation Rental', 
    'Holiday Property', 
    'Guest House',
    'Villa Rental',
    'Apartment Listing'
  ];

  const fadeInVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prevIndex) => (prevIndex + 1) % propertyTypes.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.heroWrapperr}>
      {/* Background with subtle pattern */}
      <div className={styles.backgroundPattern}></div>
      
      {/* Floating geometric shapes */}
      <div className={styles.floatingShapes}>
        <div className={`${styles.shape} ${styles.shape1}`}></div>
        <div className={`${styles.shape} ${styles.shape2}`}></div>
        <div className={`${styles.shape} ${styles.shape3}`}></div>
      </div>

      {/* Main Content */}
      <motion.div 
        id={id} 
        className={styles.contentWrapper}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className={styles.textContainer}>
          <motion.h1 
            className={styles.titleSection}
            variants={fadeInVariants}
          >
            Create Your Professional Website for <br />
            <span className={styles.animatedProperty}>
              {propertyTypes[currentWordIndex]}
            </span>
          </motion.h1>
          
          <motion.div 
            className={styles.descriptionContainer}
            variants={fadeInVariants}
          >
            <p className={styles.description}>
              Launch your own professional vacation rental website and keep up to 25% more revenue through direct bookings. Our SEO-optimized platform helps property owners create stunning websites that rank on Google and attract more guests.
            </p>
            <p className={styles.description}>
              Join thousands of successful hosts who've reduced their dependency on expensive booking platforms. Get your unique domain, accept direct reservations, sync calendars with existing platforms, and build your brand with zero technical skills required.
            </p>
            
            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <span className={styles.statNumber}>0-5%</span>
                <span className={styles.statLabel}>Transaction Fees</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>25%</span>
                <span className={styles.statLabel}>More Revenue</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>14 Days</span>
                <span className={styles.statLabel}>Free Trial</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Call-to-Action */}
        <motion.div 
          className={styles.buttonContainer}
          variants={fadeInVariants}
        >
          <div className={styles.ctaWrapper}>
            <button
              onClick={() => router.push("/getStarted")}
              className={styles.animatedButton}
            >
              <span className={styles.buttonText}>Start Free Trial - Build My Website Now!</span>
              <div className={styles.buttonIcon}>→</div>
            </button>
            
            <div className={styles.trustIndicators}>
              <div className={styles.trustBadge}>
                <span className={styles.checkmark}>✓</span>
                <span>Ready in 5 minutes</span>
              </div>
              <div className={styles.trustBadge}>
                <span className={styles.checkmark}>✓</span>
                <span>14-day free trial</span>
              </div>
              <div className={styles.trustBadge}>
                <span className={styles.checkmark}>✓</span>
                <span>No setup fees</span>
              </div>
              <div className={styles.trustBadge}>
                <span className={styles.checkmark}>✓</span>
                <span>Cancel anytime</span>
              </div>
            </div>

            <div className={styles.heroTestimonial}>
              <p className={styles.testimonialText}>
                "Increased my booking revenue by 30% in the first 3 months by eliminating platform fees!"
              </p>
              <p className={styles.testimonialAuthor}>- Sarah M., Villa Owner in Costa Rica</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default HeroSection;