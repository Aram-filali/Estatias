'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PaymentMethodSelector from 'src/components/payment/PaymentMethodSelector';
//import CardPaymentForm from 'src/components/payment/CardPaymentForm';
import OfflinePaymentInfo from 'src/components/payment/OfflinePaymentInfo';
import BookingDetails from 'src/components/payment/BookingDetails';
import LoadingSpinner from 'src/components/loading/LoadingSpinner';
import styles from './PaymentPage.module.css';

// This component should be in: app/payments/booking/[id]/page.js
export default function PaymentPage({ params }) {
  const { id } = React.use(params);
  const router = useRouter();
  
  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentStep, setPaymentStep] = useState('method-selection'); // 'method-selection', 'online-payment', 'offline-payment'
  const [processingPayment, setProcessingPayment] = useState(false);



  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Calculate payment expiration date (48 hours from now)
  const getExpirationDate = () => {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 48);
    return expirationDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Fetch booking and property details
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) {
          setError('Booking ID not found. Please check your URL.');
          setLoading(false);
          return;
        }
        setLoading(true);
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
        console.log('Property ID:', bookingData.propertyId);
        
        // Fetch property details to get means of payment
        const propertyResponse = await fetch(`${baseUrl}/properties/${bookingData.propertyId}`);
        
        if (!propertyResponse.ok) {
          throw new Error(`HTTP error! status: ${propertyResponse.status}`);
        }
        
        const propertyData = await propertyResponse.json();
        
        if (!propertyData) {
          throw new Error("No data received");
        }
        setProperty(propertyData);
        
        // If there's only one payment method, auto-select it
        if (propertyData.means_of_payment && propertyData.means_of_payment.length === 1) {
          setSelectedPaymentMethod(propertyData.means_of_payment[0]);
          handlePaymentMethodSelected(propertyData.means_of_payment[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load payment information. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, baseUrl]);
  
  // Handle payment method selection
  const handlePaymentMethodSelected = (method) => {
    setSelectedPaymentMethod(method);
    
    // Determine next step based on payment method
    if (method === 'credit card' || method === 'debit card') {
      setPaymentStep('online-payment');
    } else if (method === 'cash' || method === 'check') {
      setPaymentStep('offline-payment');
    }
  };
  
  // Handle back button click
  const handleGoBack = () => {
    setPaymentStep('method-selection');
    setSelectedPaymentMethod(null);
  };



  // Update the booking with the selected payment method
  const updateBookingPaymentMethod = async (method) => {
    try {
      setProcessingPayment(true);
      
      const response = await fetch(`${baseUrl}/bookings/${id}/payment-method`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentMethod: method })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update payment method');
      }
      
      // Update successful
      const updatedBooking = await response.json();
      setBooking(updatedBooking);
      
      return true;
    } catch (err) {
      console.error('Error updating payment method:', err);
      setError('Failed to update payment information. Please try again.');
      setProcessingPayment(false);
      return false;
    }
  };

  
  // Handle confirm choice for offline payments
  const handleConfirmOfflinePayment = async () => {
    // Update the booking with the selected payment method
    const success = await updateBookingPaymentMethod(selectedPaymentMethod);
    // For offline payments, we can redirect to booking details
    if (success) { 
    setTimeout(() => {
        router.push(`/payments/booking/${id}/successOp`);
      }, 1500);
    }
  };
  
  // Handle online payment confirmation (redirect to payment page)
  const handleConfirmOnlinePayment = async () => {
    // Update the booking with the selected payment method
    const success = await updateBookingPaymentMethod(selectedPaymentMethod);
    // For online payments, redirect to the online payment page
    if (success) { 
      setTimeout(() => {
        router.push(`/payments/booking/${id}/PaymentOnline`);
      }, 1500);
    }
  };
  
  // Check if payment method is offline (cash or check)
  const isOfflinePayment = () => {
    return selectedPaymentMethod === 'cash' || selectedPaymentMethod === 'check';
  };

  // Check if payment method is online (credit or debit card)
  const isOnlinePayment = () => {
    return selectedPaymentMethod === 'credit card' || selectedPaymentMethod === 'debit card';
  };
  
  
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return (
      <div className={styles.paymentContainer}>
        <div className={styles.errorMessage}>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className={styles.submitButton}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!booking || !property) {
    return (
      <div className={styles.paymentContainer}>
        <div className={styles.errorMessage}>
          <p>Booking information not found. Please check the link and try again.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.paymentContainer}>
      <h1 className={styles.pageTitle}>Complete Your Booking Payment</h1>
      
      {/* Booking expiration notice - only show for online payments or method selection */}
      {(isOnlinePayment() || paymentStep === 'method-selection') && (
        <div className={styles.expirationAlert}>
          <p>
            <strong>Important:</strong> Your booking will expire if payment is not completed by {getExpirationDate()}.
          </p>
        </div>
      )}
      
      {/* Booking details */}
      <div className={styles.bookingSection}>
        <div className={styles.bookingHeader}>
          <h2 className={styles.propertyName}>{property.title || 'Property'}</h2>
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
            <div className={styles.detailLabel}>Guests</div>
            <div className={styles.detailValue}>
              {typeof booking.guests === 'object' 
                ? `${booking.guests.adults || 0} adults, ${booking.guests.children || 0} children${booking.guests.infants ? `, ${booking.guests.infants} infants` : ''}`
                : `${booking.guests || 0} ${Number(booking.guests) === 1 ? 'person' : 'people'}`}
            </div>
          </div>
          
          <div className={styles.bookingDetail}>
            <div className={styles.detailLabel}>Total Amount</div>
            <div className={styles.detailValue}>${booking.pricing.total.toFixed(2)}</div>
          </div>
        </div>
      </div>
      
      {/* Payment method selection */}
      {paymentStep === 'method-selection' && (
        <div className={styles.paymentMethodSection}>
          <h2 className={styles.sectionTitle}>Select a Payment Method</h2>
          
          <div className={styles.paymentMethodsGrid}>
            {(property.means_of_payment || []).map((method) => (
              <div 
                key={method}
                className={`${styles.paymentMethodCard} ${selectedPaymentMethod === method ? styles.selected : ''}`}
                onClick={() => handlePaymentMethodSelected(method)}
              >
                <div className={styles.paymentMethodIcon}>
                  {method === 'credit card' && '💳'}
                  {method === 'debit card' && '💳'}
                  {method === 'cash' && '💵'}
                  {method === 'check' && '📝'}
                </div>
                <div className={styles.paymentMethodName}>
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Online payment information */}
      {paymentStep === 'online-payment' && (
        <div className={styles.paymentFormSection}>
          <h2 className={styles.sectionTitle}>
            Online Payment - {selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1)}
          </h2>
          
          <div className={styles.offlineInstructions}>
            <div className={styles.instructionStep}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepText}>
                You will be redirected to our secure payment portal to complete your ${booking.pricing.total.toFixed(2)} payment.
              </div>
            </div>
            
            <div className={styles.instructionStep}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepText}>
                Please have your {selectedPaymentMethod} ready with all necessary details (card number, expiry date, and CVV).
              </div>
            </div>
            
            <div className={styles.instructionStep}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepText}>
                Your payment is secure and encrypted. You will receive a confirmation email once the payment is processed.
              </div>
            </div>
            
            <div className={styles.instructionStep}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepText}>
                After successful payment, you will receive your booking confirmation and check-in instructions.
              </div>
            </div>
          </div>
          
          <div className={styles.buttonGroup}>
            <button 
              type="button"
              onClick={handleGoBack} 
              className={styles.backButton}
            >
              Change Payment Method
            </button>
            
            <button 
              type="button"
              onClick={handleConfirmOnlinePayment} 
              className={`${styles.submitButton} ${styles.groupedSubmitButton}`}
              disabled={processingPayment}
            >
              {processingPayment ? 'Processing...' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      )}
      
      {/* Offline payment information */}
      {paymentStep === 'offline-payment' && (
        <div className={styles.paymentFormSection}>
          <h2 className={styles.sectionTitle}>
            Payment Instructions - {selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1)}
          </h2>
          
          <div className={styles.offlineInstructions}>
            <div className={styles.instructionStep}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepText}>
                Please bring {selectedPaymentMethod === 'cash' ? 'exact cash amount' : 'your check'} of ${booking.pricing.total.toFixed(2)} at check-in.
              </div>
            </div>
            
            <div className={styles.instructionStep}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepText}>
                {selectedPaymentMethod === 'cash' 
                  ? 'The property manager will provide you with a receipt upon payment.' 
                  : 'Make the check payable to "' + (property.owner_name || 'Property Owner') + '".'
                }
              </div>
            </div>
            
            <div className={styles.instructionStep}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepText}>
                Please arrive at the property during check-in hours: {property.check_in_time || '3:00 PM'} - {property.check_in_end_time || '8:00 PM'}.
              </div>
            </div>
            
            <div className={styles.instructionStep}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepText}>
                If you have any questions, please contact the property manager at {property.contact_phone || 'the provided contact number'}.
              </div>
            </div>
          </div>
          
          <div className={styles.buttonGroup}>
            <button 
              type="button"
              onClick={handleGoBack} 
              className={styles.backButton}
            >
              Change Payment Method
            </button>
            
            <button 
              type="button"
              onClick={handleConfirmOfflinePayment} 
              className={`${styles.submitButton} ${styles.groupedSubmitButton}`}
              disabled={processingPayment}
            >
              {processingPayment ? 'Processing...' : 'Confirm Selection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}