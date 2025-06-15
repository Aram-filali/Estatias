'use client';

import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import styles from './BookingSuccess.module.css';
import LoadingSpinner from '@/src/components/MyWebsite/loadingSpinner';

// Create a separate component that uses useSearchParams
function BookingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchBookingDetails() {
      if (!bookingId) {
        setLoading(false);
        setError('Booking ID not found. Please check your booking reference.');
        return;
      }
      
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/bookings/${bookingId}`, {
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
        
        const responseData = await response.json();
        const bookingData = responseData.data;
        setBooking(bookingData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(err.message || 'Failed to load booking details. Please try again later.');
        setLoading(false);
      }
    }
    
    fetchBookingDetails();
  }, [bookingId]);

  const handleGoHome = () => {
    router.push('/');
  };
  
  const handleEditDetails = () => {
    if (bookingId) {
      router.push('/MyBooking');
    } else {
      router.push('/');
    }
  };
  
  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  if (loading) {
    return <LoadingSpinner message="Loading your booking details..." />;
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.successContainer}>
      <div className={styles.successCard}>
        <div className={styles.iconSuccess}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" 
              stroke="currentColor" 
              strokeWidth="2"
            />
            <path 
              d="M8 12L10.5 14.5L16 9" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        <h1 className={styles.title}>Booking Request Submitted!</h1>
        
        <div className={styles.message}>
          <p>Thank you for your booking. We've emailed you the details you provided.</p>
          <p>Please check your inbox (and spam folder) for instructions on next steps.</p>
        </div>
        
        <div className={styles.bookingReference}>
          {bookingId && <p>Booking Reference: <span>{bookingId}</span></p>}
        </div>
        
        {booking && (
          <div className={styles.bookingSummary}>
            <h2>Reservation Summary</h2>
            
            <div className={styles.bookingDetail}>
              <div className={styles.detailRow}>
                <span>Check-in:</span>
                <span>{formatDate(booking.checkInDate)}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Check-out:</span>
                <span>{formatDate(booking.checkOutDate)}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Nights:</span>
                <span>{booking.nights}</span>
              </div>
              
              <div className={styles.guestInfo}>
                <span>Reservation Holder:</span>
                <span>{booking.customer?.fullName}</span>
              </div>
              
              {booking.guests && (
                <div className={styles.detailRow}>
                  <span>Guests:</span>
                  <span>
                    {booking.guests.adults} {booking.guests.adults === 1 ? 'Adult' : 'Adults'}
                    {booking.guests.children > 0 && `, ${booking.guests.children} ${booking.guests.children === 1 ? 'Child' : 'Children'}`}
                    {booking.guests.infants > 0 && `, ${booking.guests.infants} ${booking.guests.infants === 1 ? 'Infant' : 'Infants'}`}
                  </span>
                </div>
              )}
              
              {booking.pricing && (
                <div className={styles.pricingSummary}>
                  <div className={styles.detailRow}>
                    <span className={styles.totalPrice}>Total:</span>
                    <span className={styles.totalPrice}>${booking.pricing.total?.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className={styles.buttons}>
          <button 
            className={styles.editButton}
            onClick={handleEditDetails}
          >
            Edit Details
          </button>
          <button 
            className={styles.homeButton}
            onClick={handleGoHome}
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function BookingSuccess() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading your booking details..." />}>
      <BookingSuccessContent />
    </Suspense>
  );
}