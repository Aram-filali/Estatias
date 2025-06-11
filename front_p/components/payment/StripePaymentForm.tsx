// components/StripePaymentForm.tsx
import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import styles from 'app/dashboard/subscription/subscription.module.css';
import { createPaymentMethod } from '@/services/paymentService';

interface StripePaymentFormProps {
  onSuccess: (paymentMethod: any) => void;
  onCancel: () => void;
  hostUid: string; // Made required since this is our primary identifier
}

export default function StripePaymentForm({ 
  onSuccess,
  onCancel,
  hostUid
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    
    if (!hostUid) {
      setError('Host ID is required. Please refresh the page and try again.');
      console.error('Missing hostUid in StripePaymentForm');
      return;
    }
    
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
      
      console.log('Created Stripe payment method:', paymentMethod.id);
      console.log('Saving payment method for hostUid:', hostUid);
      
      // Use the payment service to save the payment method using only hostUid
      const data = await createPaymentMethod(paymentMethod.id, hostUid);
        
      console.log('Payment method saved successfully:', data);
      
      // Notify parent component of success
      onSuccess(data);
    } catch (err) {
      console.error('Payment method creation error:', err);
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