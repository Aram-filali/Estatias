'use client';

import React, { useState } from 'react';
import { useForm, ValidationError } from '@formspree/react';
import styles from './contact.module.css';

const ContactForm = () => {
  const [state, handleSubmit] = useForm("mzzrlryn");
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Show success message after form submission
  if (state.succeeded) {
    return (
      <div className={styles.container}>
        <div className={styles.backgroundOverlay}></div>
        <div className={styles.maxWidth}>
          <div className={styles.header}>
            <h1 className={styles.title}>Thank You!</h1>
            <p className={styles.subtitle}>
              Your message has been sent successfully. We'll get back to you within 24 hours.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className={styles.submitButton}
              style={{ marginTop: '20px' }}
            >
              Send Another Message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      

      <div className={styles.container}>
        <div className={styles.backgroundOverlay}></div>
        
        <div className={styles.maxWidth}>
          {/* Header Section */}
          <div className={styles.header}>
            <h1 className={styles.title}>
              Contact Estatias Services
            </h1>
            <p className={styles.subtitle}>
              Ready to launch your professional real estate website? Get in touch with our expert team 
              and start your journey to success with our comprehensive property management platform.
            </p>
          </div>

          <div className={styles.gridContainer}>
            {/* Contact Information */}
            <div className={styles.contactInfo}>
              <h2 className={styles.sectionTitle}>Get in Touch</h2>
              
              <div className={styles.contactList}>
                <div className={styles.contactItem}>
                  <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <h3 className={styles.contactItemTitle}>Email Support</h3>
                    <p className={styles.contactItemText}>
                      <a href="mailto:estatias.services@gmail.com" className={styles.emailLink}>
                        estatias.services@gmail.com
                      </a>
                    </p>
                    <p className={styles.contactItemSubtext}>We typically respond within 24 hours</p>
                  </div>
                </div>

                <div className={styles.contactItem}>
                  <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className={styles.contactItemTitle}>Response Time</h3>
                    <p className={styles.contactItemText}>Within 24 hours</p>
                    <p className={styles.contactItemSubtext}>Monday - Friday, 9 AM - 6 PM EST</p>
                  </div>
                </div>

                <div className={styles.contactItem}>
                  <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div>
                    <h3 className={styles.contactItemTitle}>Our Services</h3>
                    <ul className={styles.servicesList}>
                      <li>• Real Estate Website Creation</li>
                      <li>• Property Management Platform</li>
                      <li>• Reservation System Integration</li>
                      <li>• SEO Optimization & Marketing</li>
                      <li>• Calendar Sync & Booking Management</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>Send us a Message</h2>
              
              <form 
                onSubmit={handleSubmit}
                className={styles.form}
              >
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name" className={styles.label}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="Enter your full name"
                    />
                    <ValidationError 
                      prefix="Name" 
                      field="name"
                      errors={state.errors}
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className={styles.input}
                      placeholder="your@email.com"
                    />
                    <ValidationError 
                      prefix="Email" 
                      field="email"
                      errors={state.errors}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="subject" className={styles.label}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={styles.input}
                    placeholder="What can we help you with?"
                  />
                  <ValidationError 
                    prefix="Subject" 
                    field="subject"
                    errors={state.errors}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="message" className={styles.label}>
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={handleInputChange}
                    className={styles.textarea}
                    placeholder="Tell us about your property and what you're looking to achieve with your real estate website..."
                  />
                  <ValidationError 
                    prefix="Message" 
                    field="message"
                    errors={state.errors}
                  />
                </div>

                <button
                  type="submit"
                  disabled={state.submitting}
                  className={styles.submitButton}
                >
                  {state.submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>

          {/* FAQ Section */}
          <div className={styles.faqSection}>
            <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
            
            <div className={styles.faqGrid}>
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>What's included in the 14-day free trial?</h3>
                <p className={styles.faqAnswer}>During your free trial, you can add, update, and delete properties on your website. However, properties won't be published for reservations until you subscribe to a paid plan after the trial period.</p>
              </div>
              
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>What's the difference between Standard and Premium plans?</h3>
                <p className={styles.faqAnswer}>Standard plans allow up to 4 property listings with a 5% transaction fee. Premium plans offer unlimited listings with zero transaction fees, making them ideal for larger property portfolios.</p>
              </div>
              
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>Can I sync my calendar with Airbnb and Booking.com?</h3>
                <p className={styles.faqAnswer}>Yes! Our platform integrates seamlessly with major booking platforms like Airbnb and Booking.com, allowing you to sync calendars and manage all your reservations in one place.</p>
              </div>
              
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>Do I get my own unique domain name?</h3>
                <p className={styles.faqAnswer}>Absolutely! Each property owner receives their own unique domain name for their website, creating a professional online presence that's entirely yours.</p>
              </div>

              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>How does the verification process work?</h3>
                <p className={styles.faqAnswer}>We work with verified property owners only. Once your request is accepted and verification is complete, you can pay your subscription fees and start publishing your website.</p>
              </div>
              
              <div className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>Can I cancel my website anytime?</h3>
                <p className={styles.faqAnswer}>Yes, you have complete control over your website. You can delete your website at any time with full support and guidance from our Estatias Services team throughout the process.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactForm;