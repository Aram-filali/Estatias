import React from 'react';
import styles from './PaymentMethods.module.css';

const PaymentMethods = ({ 
  selectedPayment, 
  setSelectedPayment, 
  setIsPaymentMethodSelected, 
  onNextStep 
}) => {
  // Function to handle payment method change
  const handlePaymentMethodChange = (method) => {
    setSelectedPayment(method);
    setIsPaymentMethodSelected(true); // Indicate that a method has been selected
  };

  return (
    <div className={styles.stepContent}>
      <div className={styles.paymentMethodOptions}>
        {/* Credit Card Option */}
        <div className={styles.radioGroup}>
          <input 
            type="radio" 
            id="credit-card" 
            name="payment-method" 
            checked={selectedPayment === 'credit'}
            onChange={() => handlePaymentMethodChange('credit')}
          />
          <label htmlFor="credit-card" className={styles.paymentLabel}>
            <span className={styles.paymentIcon}>💳</span>
            <span>Credit or Debit Card</span>
          </label>
        </div>
        
        {/* Credit Card Form */}
        {selectedPayment === 'credit' && (
          <div className={styles.cardDetailsForm}>
            <div className={styles.cardIcons}>
              <span className={styles.cardIcon}>VISA</span>
              <span className={styles.cardIcon}>MC</span>
              <span className={styles.cardIcon}>AMEX</span>
            </div>
            <div className={styles.formRow}>
              <input 
                type="text" 
                placeholder="Card Number" 
                className={styles.fullWidth}
              />
            </div>
            <div className={styles.formRow}>
              <input 
                type="text" 
                placeholder="Expiration" 
                className={styles.halfWidth}
              />
              <input 
                type="text" 
                placeholder="CVV" 
                className={styles.halfWidth}
              />
            </div>
            <div className={styles.formRow}>
              <input 
                type="text" 
                placeholder="Postal Code" 
                className={styles.fullWidth}
              />
            </div>
            <div className={styles.formRow}>
              <select className={styles.fullWidth}>
                <option value="france">France</option>
                <option value="belgique">Belgium</option>
                <option value="suisse">Switzerland</option>
                <option value="canada">Canada</option>
              </select>
            </div>
          </div>
        )}
        
        {/* PayPal Option */}
        <div className={styles.radioGroup}>
          <input 
            type="radio" 
            id="paypal" 
            name="payment-method" 
            checked={selectedPayment === 'paypal'}
            onChange={() => handlePaymentMethodChange('paypal')}
          />
          <label htmlFor="paypal" className={styles.paymentLabel}>
            <span className={styles.paymentIcon}>P</span>
            <span>PayPal</span>
          </label>
        </div>
        
        {/* Google Pay Option */}
        <div className={styles.radioGroup}>
          <input 
            type="radio" 
            id="googlepay" 
            name="payment-method" 
            checked={selectedPayment === 'googlepay'}
            onChange={() => handlePaymentMethodChange('googlepay')}
          />
          <label htmlFor="googlepay" className={styles.paymentLabel}>
            <span className={styles.paymentIcon}>G</span>
            <span>Google Pay</span>
          </label>
        </div>
        
      </div>
      <button 
        className={styles.changeButton}
        disabled={!selectedPayment}
        onClick={onNextStep}
      >
        Done
      </button>
    </div>
  );
};

export default PaymentMethods;
