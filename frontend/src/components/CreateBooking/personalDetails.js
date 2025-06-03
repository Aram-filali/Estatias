import React, { useState, useEffect } from 'react';
import styles from './BookingSteps.module.css';

const PersonalDetails = ({ 
  personalInfo, 
  setPersonalInfo, 
  setIsPersonalInfoComplete,
  onNextStep 
}) => {
  // Local validation state
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    phone: ''
  });
  
  // Track if fields have been touched
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    phone: false
  });

  // Validate form fields
  const validateField = (name, value) => {
    switch(name) {
      case 'fullName':
        return value.trim() ? '' : 'Full name is required';
      case 'email':
        return /^\S+@\S+\.\S+$/.test(value) ? '' : 'Valid email address is required';
      case 'phone':
        return /^\+?[0-9\s()-]{8,}$/.test(value) ? '' : 'Valid phone number is required';
      default:
        return '';
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update personal info
    setPersonalInfo(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update field error if already touched
    if (touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, value)
      }));
    }
  };
  
  // Handle field blur for validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate on blur
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  // Check if all required fields are filled and valid
  useEffect(() => {
    const { fullName, email, phone } = personalInfo;
    const isComplete = 
      fullName.trim() !== '' && 
      /^\S+@\S+\.\S+$/.test(email) && 
      /^\+?[0-9\s()-]{8,}$/.test(phone);
    
    setIsPersonalInfoComplete(isComplete);
  }, [personalInfo, setIsPersonalInfoComplete]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      fullName: true,
      email: true,
      phone: true
    });
    
    // Validate all fields
    const newErrors = {
      fullName: validateField('fullName', personalInfo.fullName),
      email: validateField('email', personalInfo.email),
      phone: validateField('phone', personalInfo.phone)
    };
    
    setErrors(newErrors);
    
    // Check if there are any errors
    if (Object.values(newErrors).every(error => error === '')) {
      onNextStep();
    }
  };

  return (
    <div className={styles.personalDetailsContainer}>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="fullName">
            Full Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={personalInfo.fullName}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.fullName && touched.fullName ? styles.inputError : ''}
            placeholder="Enter your full name"
            autoComplete="name"
          />
          {errors.fullName && touched.fullName && <p className={styles.errorText}>{errors.fullName}</p>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="email">
            Email Address <span className={styles.required}>*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={personalInfo.email}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.email && touched.email ? styles.inputError : ''}
            placeholder="Enter your email address"
            autoComplete="email"
          />
          {errors.email && touched.email && <p className={styles.errorText}>{errors.email}</p>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="phone">
            Phone Number <span className={styles.required}>*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={personalInfo.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            className={errors.phone && touched.phone ? styles.inputError : ''}
            placeholder="Enter your phone number"
            autoComplete="tel"
          />
          {errors.phone && touched.phone && <p className={styles.errorText}>{errors.phone}</p>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="message">
            Message to Host <span className={styles.optional}>(optional)</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={personalInfo.message}
            onChange={handleChange}
            rows="4"
            placeholder="Introduce yourself and share why you're traveling"
          />
        </div>
        
        <div className={styles.formActions}>
          <button 
            type="submit"
            className={styles.nextButton}
            aria-label="Continue to verification"
          >
            Continue to Verification
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalDetails;