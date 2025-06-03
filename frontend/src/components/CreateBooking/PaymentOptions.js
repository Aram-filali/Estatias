import React from 'react';
import styles from './PaymentOptions.module.css';

const PaymentOptions = ({ 
  paymentOption, 
  setPaymentOption, 
  setIsPaymentOptionSelected, 
  isPaymentOptionSelected,
  priceDetails,
  formatPaymentDate,
  onNextStep
}) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.paymentOptions}>
        <div className={styles.radioGroup}>
          <input 
            type="radio" 
            id="pay-now" 
            name="payment-timing" 
            checked={paymentOption === 'full'}
            onChange={() => {
              setPaymentOption('full');
              setIsPaymentOptionSelected(true);
            }}
          />
          <label htmlFor="pay-now">Pay {priceDetails.total} € now</label>
        </div>
        <div className={styles.radioGroup}>
          <input 
            type="radio" 
            id="pay-part" 
            name="payment-timing" 
            checked={paymentOption === 'part'}
            onChange={() => {
              setPaymentOption('part');
              setIsPaymentOptionSelected(true);
            }}
          />
          <label htmlFor="pay-part">
            Pay part now and the rest later
            <div className={styles.paymentDetails}>
              {priceDetails.deposit} € now, {priceDetails.remaining} € to be paid on {formatPaymentDate()}. No additional fees. <span className={styles.moreInfo}>More information</span>
            </div>
          </label>
        </div>
      </div>
      <button 
        className={styles.changeButton}
        disabled={!isPaymentOptionSelected}
        onClick={onNextStep}
      >
        Done
      </button>
    </div>
  );
};

export default PaymentOptions;
