// app/test/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingPaymentPage({ params }) {
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, processing, success, failed
  console.log('Page component loaded');
  // Get booking ID from the URL
  const bookingId = params.id;
  
  useEffect(() => {
    console.log('useEffect triggered with bookingId:', bookingId);
    // Only fetch if we have a booking ID
    if (bookingId) {
      fetchBookingDetails(bookingId);
    }
  }, [bookingId]);
  
  const fetchBookingDetails = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch booking: ${response.status}`);
      }
      
      const result = await response.json();
      setBooking(result.data);
    } catch (err) {
      console.error('Error fetching booking details:', err);
      setError(err.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    // Simulate payment processing
    setPaymentStatus('processing');
    
    // Simulate API call to process payment
    setTimeout(() => {
      // For testing purposes, we'll just set it to success
      setPaymentStatus('success');
      
      // In a real app, you would make an API call to process the payment
      // const response = await fetch('/api/payments', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     bookingId: booking.id,
      //     amount: booking.pricing.total,
      //     // other payment details
      //   }),
      // });
    }, 2000);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">Loading booking details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={() => router.push('/')} 
            className="mt-6 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }
  
  if (!booking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Booking Not Found</h1>
          <p className="text-gray-700">We couldn't find the booking details you're looking for.</p>
          <button 
            onClick={() => router.push('/')} 
            className="mt-6 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }
  
  if (paymentStatus === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">Your booking has been confirmed.</p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <h2 className="font-semibold text-gray-700">Booking Reference: #{booking.id}</h2>
              <p className="text-gray-600">Check-in: {formatDate(booking.checkInDate)}</p>
              <p className="text-gray-600">Check-out: {formatDate(booking.checkOutDate)}</p>
            </div>
            
            <p className="text-gray-600 mb-6">
              A confirmation email has been sent to {booking.customer.email}.
            </p>
            
            <button 
              onClick={() => router.push('/')} 
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Return to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold">Complete Your Booking Payment</h1>
            <p className="mt-1">Booking ID: #{booking.id}</p>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Booking Details */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-4">
                    <p className="text-gray-500">Property ID</p>
                    <p className="font-medium">{booking.propertyId}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-500">Check-in</p>
                    <p className="font-medium">{formatDate(booking.checkInDate)}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-500">Check-out</p>
                    <p className="font-medium">{formatDate(booking.checkOutDate)}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-gray-500">Number of nights</p>
                    <p className="font-medium">{booking.nights}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Guests</p>
                    <p className="font-medium">
                      {booking.guests.adults} adults
                      {booking.guests.children > 0 ? `, ${booking.guests.children} children` : ''}
                      {booking.guests.infants > 0 ? `, ${booking.guests.infants} infants` : ''}
                    </p>
                  </div>
                </div>
                
                {/* Price Breakdown */}
                <h2 className="text-xl font-semibold mt-6 mb-4">Price Details</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal</span>
                    <span>${booking.pricing.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Service Charge</span>
                    <span>${booking.pricing.serviceCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-4">
                    <span>Tax</span>
                    <span>${booking.pricing.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>${booking.pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Payment Form */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
                <form onSubmit={handlePaymentSubmit}>
                  {/* Card Information */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="card_number">
                      Card Number
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      id="card_number"
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="expiry_date">
                        Expiry Date
                      </label>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        id="expiry_date"
                        type="text"
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cvv">
                        CVV
                      </label>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        id="cvv"
                        type="text"
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name_on_card">
                      Name on Card
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      id="name_on_card"
                      type="text"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Your payment is secure. We use SSL encryption to protect your data.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className={`w-full py-3 font-medium rounded-lg text-white ${
                      paymentStatus === 'processing' 
                        ? 'bg-blue-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    disabled={paymentStatus === 'processing'}
                  >
                    {paymentStatus === 'processing' ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      `Pay $${booking.pricing.total.toFixed(2)}`
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>If you have any questions about your booking, please contact our support team.</p>
        </div>
      </div>
    </div>
  );
}