'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PaymentMethodSelector from 'src/components/payment/PaymentMethodSelector';
import CardPaymentForm from 'src/components/payment/CardPaymentForm';
import OfflinePaymentInfo from 'src/components/payment/OfflinePaymentInfo';
import BookingDetails from 'src/components/payment/BookingDetails';
import LoadingSpinner from 'src/components/loading/LoadingSpinner';

export default function Payment({ id }) {
  const router = useRouter();
  
  const [booking, setBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentStep, setPaymentStep] = useState('method-selection'); // 'method-selection', 'card-payment', 'offline-payment'
  
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
  console.log('the page id:', id);
  // Fetch booking and property details
  useEffect(() => {
    const fetchData = async () => {
      try {
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
  }, [id, baseUrl]); // Added baseUrl as dependency
  
  // Handle payment method selection
  const handlePaymentMethodSelected = (method) => {
    setSelectedPaymentMethod(method);
    
    // Determine next step based on payment method
    if (method === 'credit card' || method === 'debit card') {
      setPaymentStep('card-payment');
    } else if (method === 'cash' || method === 'check') {
      setPaymentStep('offline-payment');
    }
  };
  
  // Handle card payment submission
  const handleCardPaymentSubmit = async (cardData) => {
    try {
      setLoading(true);
      
      // This is just a placeholder - you'll implement the actual payment processing later
      // await axios.post('/api/payments/process', {
      //   bookingId: id,
      //   paymentMethod: selectedPaymentMethod,
      //   cardData
      // });
      
      // For now, just simulate a successful payment
      setTimeout(() => {
        router.push(`/payments/booking/${id}/success`);
      }, 1500);
      
    } catch (err) {
      console.error('Payment processing error:', err);
      setError('Payment processing failed. Please try again.');
      setLoading(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!booking || !property) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="text-yellow-700">Booking information not found. Please check the link and try again.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Complete Your Booking Payment</h1>
      
      {/* Booking expiration notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
        <p className="text-yellow-700">
          <strong>Important:</strong> Your booking will expire if payment is not completed by {getExpirationDate()}.
        </p>
      </div>
      
      {/* Booking details component */}
      <BookingDetails 
        booking={booking} 
        formatDate={formatDate} 
      />
      
      {/* Payment method selection */}
      {paymentStep === 'method-selection' && (
        <PaymentMethodSelector 
          paymentMethods={property.means_of_payment || []} 
          onSelect={handlePaymentMethodSelected} 
        />
      )}
      
      {/* Card payment form */}
      {paymentStep === 'card-payment' && (
        <CardPaymentForm 
          onSubmit={handleCardPaymentSubmit}
          paymentMethod={selectedPaymentMethod}
          amount={booking.pricing.total}
        />
      )}
      
      {/* Offline payment information */}
      {paymentStep === 'offline-payment' && (
        <OfflinePaymentInfo 
          paymentMethod={selectedPaymentMethod}
          booking={booking}
          propertyId={property.id}
        />
      )}
    </div>
  );
}