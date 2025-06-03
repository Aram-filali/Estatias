'use client';

import React from 'react';

export default function BookingDetails({ booking, formatDate }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Reservation</h3>
          <p className="mb-1">
            <span className="font-medium">Check-in:</span> {formatDate(booking.checkInDate)}
          </p>
          <p className="mb-1">
            <span className="font-medium">Check-out:</span> {formatDate(booking.checkOutDate)}
          </p>
          <p className="mb-1">
            <span className="font-medium">Number of nights:</span> {booking.nights}
          </p>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Guests</h3>
          <p className="mb-1">
            <span className="font-medium">Adults:</span> {booking.guests.adults}
          </p>
          {booking.guests.children > 0 && (
            <p className="mb-1">
              <span className="font-medium">Children:</span> {booking.guests.children}
            </p>
          )}
          {booking.guests.infants > 0 && (
            <p className="mb-1">
              <span className="font-medium">Infants:</span> {booking.guests.infants}
            </p>
          )}
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="font-medium text-gray-700 mb-2">Price Details</h3>
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between py-2">
            <span>Subtotal</span>
            <span>${booking.pricing.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Service Charge</span>
            <span>${booking.pricing.serviceCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Tax</span>
            <span>${booking.pricing.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-3 font-bold border-t border-gray-200 mt-2">
            <span>Total</span>
            <span>${booking.pricing.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="font-medium text-gray-700 mb-2">Guest Information</h3>
        <p className="mb-1">
          <span className="font-medium">Name:</span> {booking.customer.fullName}
        </p>
        <p className="mb-1">
          <span className="font-medium">Email:</span> {booking.customer.email}
        </p>
        <p className="mb-1">
          <span className="font-medium">Phone:</span> {booking.customer.phone}
        </p>
      </div>
    </div>
  );
}