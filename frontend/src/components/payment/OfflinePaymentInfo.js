'use client';

import React from 'react';
import { FaMoneyBillAlt, FaInfoCircle } from 'react-icons/fa';
import { CiMoneyCheck1 } from 'react-icons/ci';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OfflinePaymentInfo({ paymentMethod, booking, propertyId }) {
  const router = useRouter();
  
  const handleConfirm = async () => {
    try {
      // In a real implementation, you would make an API call to mark this booking
      // as confirmed with an offline payment method
      // await axios.post(`/api/payments/confirm-offline`, {
      //   bookingId: booking.id,
      //   paymentMethod
      // });
      
      // Navigate to success page
      router.push(`/payments/booking/${booking.id}/success?method=${paymentMethod}`);
    } catch (error) {
      console.error('Error confirming offline payment:', error);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-6">
        {paymentMethod === 'cash' ? (
          <FaMoneyBillAlt size={24} className="text-green-500 mr-2" />
        ) : (
          <CiMoneyCheck1 size={28} className="text-blue-500 mr-2" />
        )}
        <h2 className="text-xl font-semibold capitalize">
          {paymentMethod} Payment
        </h2>
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <FaInfoCircle className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Important Information</strong>
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              You've selected to pay by {paymentMethod}. This means you'll need to arrange payment directly with the host.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-2">Next Steps:</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Your booking will be confirmed once you click "Confirm Booking" below.</li>
          <li>The host will contact you with details about how to complete the {paymentMethod} payment.</li>
          <li>You'll need to arrange the payment before your check-in date.</li>
          <li>Keep a copy of your booking confirmation as proof of your reservation.</li>
        </ol>
      </div>
      
      <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
        <div>
          <p className="text-gray-700">Total Amount to Pay:</p>
          <p className="text-xl font-bold">${booking.pricing.total.toFixed(2)}</p>
        </div>
        
        <button
          onClick={handleConfirm}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-md"
        >
          Confirm Booking
        </button>
      </div>
      
      <div className="mt-6 text-center">
        <Link
          href={`/payments/booking/${booking.id}`}
          className="text-blue-500 hover:text-blue-700"
        >
          Go Back to Payment Options
        </Link>
      </div>
    </div>
  );
}