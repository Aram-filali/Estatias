// components/StripePaymentForm.tsx
import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import styles from 'app/dashboard/subscription/subscription.module.css';
import { createPaymentMethod } from '@/services/paymentService';

interface StripePaymentFormProps {
  onSuccess: (paymentMethod: any) => void;
  onCancel: () => void;
  customerId?: string;
}

export default function StripePaymentForm({ 
  onSuccess,
  onCancel,
  customerId
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      // Create payment method with Stripe
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      });
      
      if (stripeError) throw stripeError;
      if (!paymentMethod) throw new Error('Payment method creation failed');
      
      // Use the payment service to save the payment method
      const data = await createPaymentMethod(paymentMethod.id, customerId);
        
      // Notify parent component of success
      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label>Card Details</label>
        <CardElement className={styles.cardElement} options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
            },
          },
        }} />
      </div>
      {error && <div className={styles.errorAlert}>{error}</div>}
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={!stripe || processing}
        >
          {processing ? 'Processing...' : 'Save Payment Method'}
        </button>
      </div>
    </form>
  );
}