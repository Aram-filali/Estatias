'use client';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import styles from 'app/dashboard/subscription/subscription.module.css';
import StripePaymentForm from 'components/payment/StripePaymentForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormSectionProps {
  showPaymentForm: boolean;
  handlePaymentMethodSuccess: (data: any) => void;
  setShowPaymentForm: (show: boolean) => void;
  customerId?: string;
}

export default function PaymentFormSection({
  showPaymentForm,
  handlePaymentMethodSuccess,
  setShowPaymentForm,
  customerId
}: PaymentFormSectionProps) {
  if (!showPaymentForm) return null;

  return (
    <section className={styles.paymentFormSection}>
      <div className={styles.paymentFormCard}>
        <h2>Add Payment Method</h2>
        <Elements stripe={stripePromise}>
          <StripePaymentForm
            onSuccess={handlePaymentMethodSuccess}
            onCancel={() => setShowPaymentForm(false)}
            customerId={customerId}
          />
        </Elements>
      </div>
    </section>
  );
}