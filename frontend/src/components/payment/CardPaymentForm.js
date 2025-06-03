'use client';

import React, { useState } from 'react';
import { FaCreditCard, FaLock } from 'react-icons/fa';

export default function CardPaymentForm({ onSubmit, paymentMethod, amount }) {
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: ''
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Format card number with spaces
    if (name === 'cardNumber') {
      const formattedValue = value
        .replace(/\s/g, '')
        .replace(/(\d{4})/g, '$1 ')
        .trim()
        .slice(0, 19);
      
      setCardData({ ...cardData, [name]: formattedValue });
      return;
    }
    
    // Format expiry date as MM/YY
    if (name === 'expiryDate') {
      const formattedValue = value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1/$2')
        .slice(0, 5);
      
      setCardData({ ...cardData, [name]: formattedValue });
      return;
    }
    
    // Format CVV (max 4 digits)
    if (name === 'cvv') {
      const formattedValue = value.replace(/\D/g, '').slice(0, 4);
      setCardData({ ...cardData, [name]: formattedValue });
      return;
    }
    
    setCardData({ ...cardData, [name]: value });
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Validate card number (simple check for 16 digits)
    if (!cardData.cardNumber || cardData.cardNumber.replace(/\s/g, '').length !== 16) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number';
    }
    
    // Validate card holder
    if (!cardData.cardHolder || cardData.cardHolder.trim().length < 3) {
      newErrors.cardHolder = 'Please enter the card holder name';
    }
    
    // Validate expiry date
    if (!cardData.expiryDate || !cardData.expiryDate.match(/^\d{2}\/\d{2}$/)) {
      newErrors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    } else {
      // Check if the card is not expired
      const [month, year] = cardData.expiryDate.split('/');
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
      const currentDate = new Date();
      
      if (expiryDate < currentDate) {
        newErrors.expiryDate = 'This card has expired';
      }
    }
    
    // Validate CVV (3-4 digits)
    if (!cardData.cvv || cardData.cvv.length < 3) {
      newErrors.cvv = 'Please enter a valid CVV code';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(cardData);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        <FaCreditCard size={24} className="text-blue-500 mr-2" />
        <h2 className="text-xl font-semibold">
          {paymentMethod === 'credit card' ? 'Credit Card' : 'Debit Card'} Payment
        </h2>
      </div>
      
      <div className="border-t border-gray-200 pt-4">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="cardNumber">
              Card Number
            </label>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={cardData.cardNumber}
              onChange={handleChange}
              placeholder="1234 5678 9012 3456"
              className={`w-full p-3 border rounded-md ${
                errors.cardNumber ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.cardNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="cardHolder">
              Card Holder Name
            </label>
            <input
              type="text"
              id="cardHolder"
              name="cardHolder"
              value={cardData.cardHolder}
              onChange={handleChange}
              placeholder="John Doe"
              className={`w-full p-3 border rounded-md ${
                errors.cardHolder ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.cardHolder && (
              <p className="text-red-500 text-sm mt-1">{errors.cardHolder}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="expiryDate">
                Expiry Date
              </label>
              <input
                type="text"
                id="expiryDate"
                name="expiryDate"
                value={cardData.expiryDate}
                onChange={handleChange}
                placeholder="MM/YY"
                className={`w-full p-3 border rounded-md ${
                  errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.expiryDate && (
                <p className="text-red-500 text-sm mt-1">{errors.expiryDate}</p>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="cvv">
                CVV
              </label>
              <input
                type="text"
                id="cvv"
                name="cvv"
                value={cardData.cvv}
                onChange={handleChange}
                placeholder="123"
                className={`w-full p-3 border rounded-md ${
                  errors.cvv ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.cvv && (
                <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center bg-gray-50 p-4 rounded-md mb-6">
            <FaLock className="text-green-500 mr-2" />
            <p className="text-sm text-gray-600">
              Your payment information is secure and encrypted
            </p>
          </div>
          
          <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
            <div>
              <p className="text-gray-700">Total Amount:</p>
              <p className="text-xl font-bold">${amount.toFixed(2)}</p>
            </div>
            
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-md"
            >
              Pay Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}