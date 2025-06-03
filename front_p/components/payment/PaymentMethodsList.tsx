// components/PaymentMethodsList.tsx
import { FaRegCreditCard, FaPaypal } from 'react-icons/fa';
import styles from 'app/dashboard/subscription/subscription.module.css';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal';
  details: {
    brand?: string;
    lastFour?: string;
    expiryDate?: string;
    email?: string;
  };
  isDefault: boolean;
}

interface PaymentMethodsListProps {
  paymentMethods: PaymentMethod[];
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
  onAddNew: () => void;
}

export default function PaymentMethodsList({
  paymentMethods,
  onSetDefault,
  onRemove,
  onAddNew
}: PaymentMethodsListProps) {
  
  const renderPaymentMethodIcon = (type: 'card' | 'paypal') => {
    switch(type) {
      case 'card': return <FaRegCreditCard />;
      case 'paypal': return <FaPaypal />;
      default: return <FaRegCreditCard />;
    }
  };

  const renderPaymentMethodDetails = (method: PaymentMethod) => {
    switch(method.type) {
      case 'card':
        return (
          <>
            {method.details.brand} •••• {method.details.lastFour}
            <div className={styles.cardExpiry}>
              Expires: {method.details.expiryDate}
            </div>
          </>
        );
      case 'paypal':
        return (
          <>
            PayPal
            <div className={styles.cardExpiry}>
              {method.details.email}
            </div>
          </>
        );
      default:
        return 'Payment Method';
    }
  };

  return (
    <div className={styles.paymentMethodsContainer}>
      {paymentMethods.length > 0 ? (
        paymentMethods.map(method => (
          <div key={method.id} className={`${styles.paymentMethodCard} ${method.isDefault ? styles.defaultPaymentMethod : ''}`}>
            <div className={styles.paymentMethodInfo}>
              <div className={styles.cardType}>
                {renderPaymentMethodIcon(method.type)}
                {renderPaymentMethodDetails(method)}
              </div>
            </div>
            <div className={styles.paymentMethodActions}>
              {method.isDefault ? (
                <span className={styles.defaultBadge}>Default</span>
              ) : (
                <button 
                  className={styles.smallButton}
                  onClick={() => onSetDefault(method.id)}
                >
                  Set Default
                </button>
              )}
              <button 
                className={styles.smallButton}
                onClick={() => onRemove(method.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className={styles.noPaymentMethods}>
          <p>No payment methods added yet</p>
          <button 
            className={styles.addPaymentButton}
            onClick={onAddNew}
          >
            Add Payment Method
          </button>
        </div>
      )}
    </div>
  );
}