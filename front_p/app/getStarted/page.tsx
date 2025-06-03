"use client";
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';
import { motion } from "framer-motion";
import styles from './getStarted.module.css';

const GetStarted: React.FC = () => {
  const router = useRouter();
  
  const handleStartAccount = useCallback(() => {
    router.push("/create-site/signup");
  }, [router]);

  const steps = [
    { 
      number: '01', 
      title: 'Create Account', 
      description: 'Quick, simple registration', 
      borderColor: 'border-white' 
    },
    { 
      number: '02', 
      title: 'Add Property', 
      description: 'Enter your property details', 
      borderColor: 'border-slate-300' 
    },
    { 
      number: '03', 
      title: 'Launch Website', 
      description: 'Go live instantly', 
      borderColor: 'border-slate-200' 
    }
  ];

  return (
    <div className={styles.pageContainer}>
      {/* Blurred Background */}
      <div className={styles.backgroundOverlay}>
        <div 
          className={styles.backgroundImage}
          style={{ 
            backgroundImage: 'url(/bg-city.jpg)', 
          }}
        />
      </div>
      
      <div className={styles.contentWrapper}>
        {/* Hero Title */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={styles.heroTitle}
        >
          <h1>Start Creating Your Own Website</h1>
        </motion.div>

        {/* Steps Workflow */}
        <div className={styles.stepsContainer}>
          {steps.map((step) => (
            <motion.div 
              key={step.number}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: parseInt(step.number) * 0.2 }}
              className={`${styles.stepCard} ${styles[step.borderColor as keyof typeof styles]}`}
            >
              <div className={styles.stepContent}>
                <div className={styles.stepText}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                <span className={styles.stepNumber}>{step.number}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <div className={styles.ctaContainer}>
          <button 
            onClick={handleStartAccount}
            className={styles.ctaButton}
          >
            Step 1: Account Creation
          </button>
          <p className={styles.ctaSubtext}>
            No credit card required • Free 14-day trial • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;