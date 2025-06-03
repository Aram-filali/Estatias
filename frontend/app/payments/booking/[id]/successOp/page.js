'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from 'src/components/loading/LoadingSpinner';
import styles from './SuccessPage.module.css';

export default function SuccessPage({ params }) {
  const { id } = React.use(params);
  const router = useRouter();
  
  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Fetch booking and property details
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) {
          setError('Booking ID not found. Please check your URL.');
          setLoading(false);
          return;
        }
        
        console.log("Fetching booking with ID:", id);
        
        // Fetch booking details
        const response = await fetch(`${baseUrl}/bookings/${id}`, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.status === 404) {
          throw new Error('Booking not found');
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch booking details: ${response.statusText}`);
        }
        
        // Parse the response
        const responseData = await response.json();
        const bookingData = responseData.data;
        setBooking(bookingData);
        
        console.log('Booking Data:', bookingData);
        
        // Fetch property details
        const propertyResponse = await fetch(`${baseUrl}/properties/${bookingData.propertyId}`);
        
        if (!propertyResponse.ok) {
          throw new Error(`HTTP error! status: ${propertyResponse.status}`);
        }
        
        const propertyData = await propertyResponse.json();
        
        if (!propertyData) {
          throw new Error("No data received");
        }
        setProperty(propertyData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load booking information. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Animate progress bar
    const timer = setTimeout(() => {
      setProgress(100);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [id, baseUrl]);
  
  // Get the payment method (assuming it's stored in the booking data)
  const getPaymentMethod = () => {
    if (!booking || !booking.paymentMethod) {
      // If payment method isn't stored in booking data, determine from property
      if (property && property.means_of_payment && property.means_of_payment.length > 0) {
        const offlinePayments = property.means_of_payment.filter(method => 
          method === 'cash' || method === 'check'
        );
        if (offlinePayments.length > 0) {
          return offlinePayments[0]; // Return the first offline payment method
        }
      }
      return 'cash'; // Default to cash if no payment method found
    }
    return booking.paymentMethod;
  };
  
  // Get check-in time from property data
  const getCheckInTime = () => {
    if (property && property.policies) {
      const start = property.policies.check_in_start || '3:00 PM';
      const end = property.policies.check_in_end || '8:00 PM';
      return `${start} - ${end}`;
    }
    return '3:00 PM - 8:00 PM'; // Default check-in time
  };
  
  // Get contact information
  const getContactInfo = () => {
    const contacts = [];
    
    if (property) {
      if (property.email) {
        contacts.push(`Email: ${property.email}`);
      }
      
      if (property.phone) {
        contacts.push(`Phone: ${property.phone}`);
      }
    }
    
    return contacts.length > 0 
      ? contacts.join('\n') 
      : 'Contact information not available';
  };
  
  // Render loading spinner
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Render error message
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className={styles.button}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  // Render success page
  if (!booking || !property) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <p>Booking information not found. Please check the link and try again.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.successCard}>
        {/* Progress indicator */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }}></div>
        </div>
        
        {/* Success icon and message */}
        <div className={styles.successIconContainer}>
          <div className={styles.successIcon}>
             <svg
                xmlns="http://www.w3.org/2000/svg"
                width="100"
                height="100"
                fill="green"
                viewBox="0 0 24 24"
            >
                <path d="M20.285 6.709l-11.025 11.025-5.546-5.546 1.414-1.414 4.132 4.132 9.611-9.611z" />
            </svg>
          </div>
        </div>
        
        <h1 className={styles.title}>Your booking has been confirmed!</h1>
        
        <p className={styles.message}>
          Please remember to bring the exact {getPaymentMethod() === 'cash' ? 'cash amount' : 'check'} of ${booking.pricing.total.toFixed(2)} at check-in.
        </p>
        
        {/* Property details */}
        <div className={styles.detailsContainer}>
          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>🕒</div>
            <div className={styles.detailContent}>
              <h3>Check-in Time</h3>
              <p>{getCheckInTime()}</p>
            </div>
          </div>
          
          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>📍</div>
            <div className={styles.detailContent}>
              <h3>Property Address</h3>
              <p>{property.address}</p>
              <p>{property.city}, {property.country}</p>
            </div>
          </div>
          
          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>📅</div>
            <div className={styles.detailContent}>
              <h3>Your Stay</h3>
              <p>{formatDate(booking.checkInDate)} to {formatDate(booking.checkOutDate)}</p>
            </div>
          </div>
          
          <div className={styles.detailItem}>
            <div className={styles.detailIcon}>📞</div>
            <div className={styles.detailContent}>
              <h3>Contact</h3>
              {property.email && <p>Email: {property.email}</p>}
              {property.phone && <p>Phone: {property.phone}</p>}
              {!property.email && !property.phone && <p>Contact information not available</p>}
            </div>
          </div>
        </div>
          
        <div className={styles.emailNotice}>
          <p>We've sent a confirmation to your email.</p>
        </div>
        
        <div className={styles.buttonContainer}>
          <button 
            className={styles.button}
            onClick={() => router.push('/bookings')}
          >
            Return to Home
          </button>
          
          {/*<button 
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={() => router.push('/')}
          >
            Return to Home
          </button>*/}
        </div>
      </div>
    </div>
  );
}