'use client';

import React from 'react';
import { FaCreditCard, FaMoneyBillAlt, FaCheckSquare } from 'react-icons/fa';
import { CiMoneyCheck1 } from 'react-icons/ci';

export default function PaymentMethodSelector({ paymentMethods, onSelect }) {
  if (!paymentMethods || paymentMethods.length === 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <p className="text-red-700">
          No payment methods are available for this booking. Please contact the host.
        </p>
      </div>
    );
  }
  
  // If there's only one payment method, no need to show selection UI
  if (paymentMethods.length === 1) {
    return (
      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
        <p className="text-green-700">
          This property only accepts <strong>{paymentMethods[0]}</strong> as payment method.
          Proceeding with this payment option...
        </p>
      </div>
    );
  }
  
  const getPaymentIcon = (method) => {
    switch (method) {
      case 'credit card':
        return <FaCreditCard size={24} />;
      case 'debit card':
        return <FaCreditCard size={24} />;
      case 'cash':
        return <FaMoneyBillAlt size={24} />;
      case 'check':
        return <CiMoneyCheck1 size={28} />;
      default:
        return <FaCheckSquare size={24} />;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Select Payment Method</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <button
            key={method}
            onClick={() => onSelect(method)}
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="mr-3 text-blue-500">
              {getPaymentIcon(method)}
            </span>
            <span className="text-lg capitalize">
              {method}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}