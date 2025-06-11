'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import LoadingSpinner from 'src/components/loading/LoadingSpinner';
import styles from '../PaymentPage.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function PaymentOnlinePage({ params }) {
  // Fix: Handle params properly - it might be a promise or direct object
  const [id, setId] = useState(null);
  const router = useRouter();
  
  const [booking, setBooking] = useState(null);
  const [hostPlan, setHostPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const hostId = process.env.NEXT_PUBLIC_HOST_ID;

  // Extract ID from params
  useEffect(() => {
    const extractId = async () => {
      try {
        let extractedId;
        
        // Handle both promise and direct object cases
        if (params && typeof params.then === 'function') {
          // params is a promise
          const resolvedParams = await params;
          extractedId = resolvedParams.id;
        } else if (params && params.id) {
          // params is a direct object
          extractedId = params.id;
        }
        
        console.log('Extracted booking ID:', extractedId);
        setId(extractedId);
      } catch (error) {
        console.error('Error extracting ID from params:', error);
        setError('Invalid booking URL. Please check your link.');
        setLoading(false);
      }
    };
    
    extractId();
  }, [params]);

  // Fetch booking details and host plan
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) {
          // Don't set error here, wait for ID to be extracted
          return;
        }

        if (!hostId) {
          setError('Host configuration missing. Please contact support.');
          setLoading(false);
          return;
        }

        console.log('Fetching data for booking ID:', id);
        setLoading(true);
        setError(null);
        
        // Fetch booking details
        const bookingUrl = `${baseUrl}/bookings/${id}`;
        console.log('Fetching booking from:', bookingUrl);
        
        const bookingResponse = await fetch(bookingUrl, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('Booking response status:', bookingResponse.status);
        
        if (!bookingResponse.ok) {
          const errorText = await bookingResponse.text();
          console.error('Booking fetch error response:', errorText);
          throw new Error(`Failed to fetch booking details: ${bookingResponse.status} ${bookingResponse.statusText}`);
        }
        
        const bookingData = await bookingResponse.json();
        console.log('Booking data received:', bookingData);
        
        if (!bookingData.data) {
          throw new Error('No booking data received from server');
        }
        
        const booking = bookingData.data;
        setBooking(booking);
        
        // Fetch host plan details
        const hostPlanUrl = `${baseUrl}/hosts/${hostId}/plan`;
        console.log('Fetching host plan from:', hostPlanUrl);
        
        const hostPlanResponse = await fetch(hostPlanUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN || 'dummy-token'}`,
          }
        });
        
        console.log('Host plan response status:', hostPlanResponse.status);
        
        if (!hostPlanResponse.ok) {
          const errorText = await hostPlanResponse.text();
          console.error('Host plan fetch error response:', errorText);
          throw new Error(`Failed to fetch host plan: ${hostPlanResponse.status} ${hostPlanResponse.statusText}`);
        }
        
        const hostPlanData = await hostPlanResponse.json();
        console.log('Host plan data received:', hostPlanData);
        setHostPlan(hostPlanData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to load payment information: ${err.message}`);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, baseUrl, hostId]);

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle Stripe payment
  const handlePayment = async () => {
    if (!booking || !hostPlan) {
        setError('Missing booking or host plan data');
        return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
        console.log('Starting payment process...');
        console.log('Base URL:', baseUrl);
        console.log('Request payload:', {
        hostId: booking.hostId,
        bookingId: booking._id,
        amount: Math.round(booking.pricing.total * 100),
        plan: hostPlan.plan,
        currency: 'eur',
        guestId: booking.customer.email,
        });

        // Test if the server is reachable first
        const healthCheck = await fetch(`${baseUrl}/connect/health-check`, {
        method: 'GET',
        }).catch(err => {
        console.error('Health check failed:', err);
        throw new Error(`Cannot connect to server at ${baseUrl}. Is the backend running?`);
        });

        if (!healthCheck.ok) {
        throw new Error(`Server is not responding properly (status: ${healthCheck.status})`);
        }

        // Create checkout session
        const response = await fetch(`${baseUrl}/connect/checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            hostId: booking.hostId,
            bookingId: booking._id,
            amount: Math.round(booking.pricing.total * 100), // Convert to cents
            plan: hostPlan.plan,
            currency: 'eur',
            guestId: booking.customer.email, // Using email as guest identifier
        }),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('Success response:', responseData);

        const { sessionUrl } = responseData.data; // Changed from responseData.sessionUrl to responseData.data.sessionUrl

      if (!sessionUrl) {
          console.error('Full response data:', JSON.stringify(responseData, null, 2));
          throw new Error('No payment session URL received');
      }

        // Redirect to Stripe Checkout
        window.location.href = sessionUrl;
    } catch (error) {
        console.error('Payment error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        });
        
        // Provide more user-friendly error messages
        let userMessage = 'Payment failed: ';
        
        if (error.message.includes('Failed to fetch') || error.message.includes('Connection closed')) {
        userMessage += 'Unable to connect to payment server. Please check your internet connection and try again.';
        } else if (error.message.includes('Cannot connect to server')) {
        userMessage += 'Payment server is currently unavailable. Please try again in a few moments.';
        } else {
        userMessage += error.message;
        }
        
        setError(userMessage);
        setProcessingPayment(false);
    }
    };

  // Handle back button
  const handleGoBack = () => {
    router.push(`/payments/booking/${id}`);
  };

  // Show loading while extracting ID or fetching data
  if (loading || !id) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className={styles.paymentContainer}>
        <div className={styles.errorMessage}>
          <p>{error}</p>
          <details style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            <summary>Debug Information</summary>
            <p>Booking ID: {id || 'Not extracted'}</p>
            <p>Base URL: {baseUrl}</p>
            <p>Host ID: {hostId || 'Not configured'}</p>
          </details>
        </div>
        <div className={styles.buttonGroup}>
          <button 
            onClick={handleGoBack}
            className={styles.backButton}
            disabled={!id}
          >
            Go Back
          </button>
          <button 
            onClick={() => window.location.reload()}
            className={styles.submitButton}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className={styles.paymentContainer}>
        <div className={styles.errorMessage}>
          <p>Booking information not found. Please check the link and try again.</p>
        </div>
        <button 
          onClick={handleGoBack}
          className={styles.backButton}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className={styles.paymentContainer}>
      <h1 className={styles.pageTitle}>Secure Payment</h1>
      
      {/* Payment expiration notice */}
      <div className={styles.expirationAlert}>
        <p>
          <strong>Important:</strong> Complete your payment within the next 48 hours to secure your booking.
        </p>
      </div>
      
      {/* Booking summary */}
      <div className={styles.bookingSection}>
        <div className={styles.bookingHeader}>
          <h2 className={styles.sectionTitle}>Booking Summary</h2>
          <div className={styles.bookingId}>Booking #{booking._id}</div>
        </div>
        
        <div className={styles.bookingDetails}>
          <div className={styles.bookingDetail}>
            <div className={styles.detailLabel}>Check-in</div>
            <div className={styles.detailValue}>{formatDate(booking.checkInDate)}</div>
          </div>
          
          <div className={styles.bookingDetail}>
            <div className={styles.detailLabel}>Check-out</div>
            <div className={styles.detailValue}>{formatDate(booking.checkOutDate)}</div>
          </div>
          
          <div className={styles.bookingDetail}>
            <div className={styles.detailLabel}>Duration</div>
            <div className={styles.detailValue}>{booking.nights} {booking.nights === 1 ? 'night' : 'nights'}</div>
          </div>
          
          <div className={styles.bookingDetail}>
            <div className={styles.detailLabel}>Guests</div>
            <div className={styles.detailValue}>
              {typeof booking.guests === 'object' 
                ? `${booking.guests.adults || 0} adults, ${booking.guests.children || 0} children${booking.guests.infants ? `, ${booking.guests.infants} infants` : ''}`
                : `${booking.guests || 0} ${Number(booking.guests) === 1 ? 'person' : 'people'}`}
            </div>
          </div>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className={styles.bookingSection}>
        <h2 className={styles.sectionTitle}>Payment Details</h2>
        
        <div className={styles.pricingDetails}>
          <div className={styles.pricingRow}>
            <span>Subtotal</span>
            <span>€{booking.pricing.subtotal.toFixed(2)}</span>
          </div>
          
          {booking.pricing.serviceCharge > 0 && (
            <div className={styles.pricingRow}>
              <span>Service Charge</span>
              <span>€{booking.pricing.serviceCharge.toFixed(2)}</span>
            </div>
          )}
          
          {booking.pricing.taxAmount > 0 && (
            <div className={styles.pricingRow}>
              <span>Taxes</span>
              <span>€{booking.pricing.taxAmount.toFixed(2)}</span>
            </div>
          )}
          
          <div className={`${styles.pricingRow} ${styles.totalRow}`}>
            <span><strong>Total Amount</strong></span>
            <span><strong>€{booking.pricing.total.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      {/* Customer information */}
      <div className={styles.bookingSection}>
        <h2 className={styles.sectionTitle}>Customer Information</h2>
        
        <div className={styles.bookingDetails}>
          <div className={styles.bookingDetail}>
            <div className={styles.detailLabel}>Name</div>
            <div className={styles.detailValue}>{booking.customer.fullName}</div>
          </div>
          
          <div className={styles.bookingDetail}>
            <div className={styles.detailLabel}>Email</div>
            <div className={styles.detailValue}>{booking.customer.email}</div>
          </div>
          
          <div className={styles.bookingDetail}>
            <div className={styles.detailLabel}>Phone</div>
            <div className={styles.detailValue}>{booking.customer.phone}</div>
          </div>
        </div>
      </div>

      {/* Payment section */}
      <div className={styles.paymentFormSection}>
        <h2 className={styles.sectionTitle}>Complete Payment</h2>
        
        <div className={styles.offlineInstructions}>
          <div className={styles.instructionStep}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepText}>
              Click "Pay Now" to be redirected to our secure payment portal powered by Stripe.
            </div>
          </div>
          
          <div className={styles.instructionStep}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepText}>
              Your payment information is encrypted and secure. We do not store your card details.
            </div>
          </div>
          
          <div className={styles.instructionStep}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepText}>
              After successful payment, you will receive a confirmation email with your booking details.
            </div>
          </div>
        </div>
        
        <div className={styles.buttonGroup}>
          <button 
            type="button"
            onClick={handleGoBack} 
            className={styles.backButton}
            disabled={processingPayment}
          >
            Go Back
          </button>
          
          <button 
            type="button"
            onClick={handlePayment} 
            className={`${styles.submitButton} ${styles.groupedSubmitButton}`}
            disabled={processingPayment || !booking || !hostPlan}
          >
            {processingPayment ? 'Processing...' : `Pay €${booking.pricing.total.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Security notice */}
      <div className={styles.securityNotice}>
        <p>
          <strong>🔒 Secure Payment:</strong> Your payment is protected by industry-standard SSL encryption. 
          This site is verified and secured by Stripe.
        </p>
      </div>
    </div>
  );
}