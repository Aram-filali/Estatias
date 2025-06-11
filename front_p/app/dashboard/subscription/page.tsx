'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { FaBell } from 'react-icons/fa';
import styles from './subscription.module.css';
import StripePaymentForm from 'components/payment/StripePaymentForm';
import PaymentMethodsList, { PaymentMethod } from 'components/payment/PaymentMethodsList';
import { 
  removePaymentMethod,
  verifyPaymentMethod, 
  processPayment, 
  fetchPaymentMethods,
  setDefaultPaymentMethod
} from '@/services/paymentService';
import axios from 'axios';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  text: string;
  date: string;
  type?: string;
  isRead: boolean;
  actionUrl?: string;
}

interface PlanDetails {
  id: string;
  name: string;
  monthlyCost: number;
  description: string;
  transactionalDetails?: string;
  upfrontCost: number;
}

interface SubscriptionData {
  firebaseUid: string;
  plan: string;
  trialEndsAt: Date;
  isTrialActive: boolean;
  status: string;
  paymentMethods: PaymentMethod[];
  customerId?: string;
  // New payment-related fields
  isPaid?: boolean;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentDate?: Date;
  subscriptionStartDate?: Date;
}

interface SubscriptionState extends Omit<SubscriptionData, 'firebaseUid' |'status' | 'paymentMethods'> {
  paymentMethods: PaymentMethod[];
  billingHistory: BillingHistory[];
  customerId?: string;
  // New payment-related fields
  isPaid?: boolean;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentDate?: Date;
  subscriptionStartDate?: Date;
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl: string;
  type: 'setup' | 'maintenance' | 'transaction';
  paymentIntentId?: string; // Add payment intent tracking

}

interface DashboardDto {
  id: string;
  name: string;
  email: string;
  plan: string;
  trialEndsAt: Date;
  isTrialActive: boolean;
  status: string;
  websiteUrl: string;
  notifications: Notification[];
  revenue: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function SubscriptionSection({ hostId }: { hostId: string }) {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isPremium] = useState(true);
  const [plans, setPlans] = useState<PlanDetails[]>([
    { id: 'standard', name: 'Standard Plan', monthlyCost: 29, description: 'Full hosting features.', transactionalDetails: '5% per transaction', upfrontCost: 500 },
    { id: 'premium', name: 'Premium Plan', monthlyCost: 49, description: 'Advanced hosting features.', transactionalDetails: 'No transaction costs', upfrontCost: 2500 },
  ]);
  
  // Initialize subscription state using plan-appropriate upfront cost
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState | null>(() => {
    const currentPlanId = isPremium ? 'premium' : 'standard';
    const currentPlan = plans.find(plan => plan.id === currentPlanId);
    
    return {
      plan: isPremium ? 'Premium Plan' : 'Standard Plan',
      isTrialActive: true,
      trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      paymentMethods: [],
      billingHistory: [
        { 
          id: 'inv1', 
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          amount: currentPlan?.upfrontCost || (isPremium ? 2500 : 500), 
          status: 'pending' as const, 
          invoiceUrl: '#',
          type: 'setup' as const
        },
      ]
    };
  });
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [trialPercentage, setTrialPercentage] = useState(100);
  const [trialStatus, setTrialStatus] = useState({ text: '', className: '' });
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [host, setHost] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();
  console.log('SubscriptionSection received hostId:', hostId);

 useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          
          console.log('Firebase user UID:', user.uid);
          console.log('Prop hostId:', hostId);
          
          // Use the Firebase user UID as the primary identifier
          const userUid = user.uid;
          
          // Fetch host data first
          await fetchHostData(userUid, token);
          
          // Then fetch subscription data which will trigger payment methods refresh
          await fetchSubscriptionData(userUid, token);
          
        } catch (err) {
          console.error("Error getting authentication token:", err);
          setError("Authentication error. Please try logging in again.");
        } finally {
          setLoading(false);
        }
      } else {
        setError("You must be logged in to view the dashboard.");
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, hostId]); 



  useEffect(() => {
  console.log('=== Subscription State Debug ===');
  console.log('subscriptionState:', subscriptionState);
  console.log('subscriptionData:', subscriptionData);
  console.log('subscriptionState customerId:', subscriptionState?.customerId);
  console.log('subscriptionData customerId:', subscriptionData?.customerId);
  console.log('================================');
}, [subscriptionState, subscriptionData]);

  const fetchHostData = async (hostId: string, token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hosts/dashboard/${hostId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHost(response.data.profile);
    } catch (err) {
      console.error("Error fetching host data:", err);
      setError("Failed to load host data.");
    }
  };




  // Updated subscription component methods
const refreshPaymentMethods = async (hostUid: string) => {
  if (!hostUid) {
    console.log('No hostUid provided to refreshPaymentMethods');
    return;
  }
  
  try {
    console.log('Fetching payment methods for hostUid:', hostUid);
    const response = await fetchPaymentMethods(hostUid); // Changed from customerId to hostUid
    
    if (response?.paymentMethods) {
      console.log('Successfully fetched payment methods:', response.paymentMethods);
      setSubscriptionState(prev => prev ? { 
        ...prev, 
        paymentMethods: response.paymentMethods
      } : null);
      
      setSubscriptionData(prev => prev ? {
        ...prev,
        paymentMethods: response.paymentMethods
      } : null);
    }
  } catch (error) {
    console.error('Failed to refresh payment methods:', error);
    setPaymentError(error instanceof Error ? error.message : 'Failed to load payment methods');
  }
};

 // Updated fetchSubscriptionData method
const fetchSubscriptionData = async (hostId: string, token: string) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/hosts/${hostId}/plan`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.message) {
      setError(response.data.message);
      return;
    }

    const planData = response.data;

    const subscriptionInfo: SubscriptionData = {
      firebaseUid: planData.firebaseUid || hostId,
      plan: planData.plan,
      trialEndsAt: new Date(planData.trialEndsAt),
      isTrialActive: planData.isTrialActive,
      status: planData.status,
      paymentMethods: [],
      //customerId: planData.customerId,
      // New payment fields
      isPaid: planData.isPaid || false,
      paymentStatus: planData.paymentStatus || 'pending',
      paymentDate: planData.paymentDate ? new Date(planData.paymentDate) : undefined,
      subscriptionStartDate: planData.subscriptionStartDate ? new Date(planData.subscriptionStartDate) : undefined,
    };


    setSubscriptionData(subscriptionInfo);
    
    // Find the current plan to get its upfront cost
    const currentPlan = plans.find(plan => plan.id === (planData.plan === 'Premium Plan' ? 'premium' : 'standard'));
    const upfrontCost = currentPlan?.upfrontCost || (planData.plan === 'Premium Plan' ? 2500 : 500);
    
    // Update billing history with correct amount and payment status
    let updatedBillingHistory = planData.billingHistory || [];
    if (!updatedBillingHistory.length && subscriptionState?.billingHistory) {
      updatedBillingHistory = subscriptionState.billingHistory.map(item => ({
        ...item,
        amount: upfrontCost,
        // Update status based on payment status
        status: planData.isPaid ? 'paid' : (planData.paymentStatus === 'failed' ? 'failed' : 'pending')
      }));
    }
    
    // Update subscriptionState with all new fields
    setSubscriptionState(prev => prev ? {
      ...prev,
      plan: planData.plan,
      trialEndsAt: new Date(planData.trialEndsAt),
      isTrialActive: planData.isTrialActive,
      customerId: planData.customerId,
      isPaid: planData.isPaid || false,
      paymentStatus: planData.paymentStatus || 'pending',
      paymentDate: planData.paymentDate ? new Date(planData.paymentDate) : undefined,
      subscriptionStartDate: planData.subscriptionStartDate ? new Date(planData.subscriptionStartDate) : undefined,
      billingHistory: updatedBillingHistory
    } : null);
    
    updateTrialStatus({
      trialEndsAt: new Date(planData.trialEndsAt),
      isTrialActive: planData.isTrialActive
    });
    
    // Fetch payment methods using hostId
    console.log('Fetching payment methods for hostUid:', hostId);
    await refreshPaymentMethods(hostId);
  } catch (err) {
    console.error("Error fetching subscription data:", err);
    setError("Failed to load subscription data.");
  } finally {
    setLoading(false);
  }
};

  const updateTrialStatus = (data: { trialEndsAt: Date, isTrialActive: boolean }) => {
    if (!data.isTrialActive) {
      setTrialStatus({ text: "Trial Expired", className: styles.expired });
      setDaysLeft(0);
      setTrialPercentage(0);
      return;
    }
  
    const trialEnd = new Date(data.trialEndsAt);
    const now = new Date();
    const totalTrialDays = 14;
  
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    setDaysLeft(daysRemaining);
    
    // Calcul de la progression du trial
    const trialPercentage = Math.max(0, Math.min(100, (daysRemaining / totalTrialDays) * 100));
    setTrialPercentage(trialPercentage);
  
    if (daysRemaining <= 2) {
      setTrialStatus({ text: `Trial ends in ${daysRemaining} days`, className: styles.critical });
    } else if (daysRemaining <= 5) {
      setTrialStatus({ text: `Trial ends in ${daysRemaining} days`, className: styles.warning });
    } else {
      setTrialStatus({ text: `${daysRemaining} days left in trial`, className: styles.active });
    }
  };
  

  // Helper function from first example to get trial status
  const getTrialStatus = () => {
    if (!subscriptionState?.isTrialActive) {
      return { text: "Trial Expired", className: styles.expired };
    }

    const trialEnd = new Date(subscriptionState.trialEndsAt);
    const now = new Date();
    const totalTrialDays = 14;

    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 2) {
      return { text: `Trial ends in ${daysRemaining} days`, className: styles.critical };
    } else if (daysRemaining <= 5) {
      return { text: `Trial ends in ${daysRemaining} days`, className: styles.warning };
    } else {
      return { text: `${daysRemaining} days left in trial`, className: styles.active };
    }
  };

  

  // Updated handlePaymentMethodSuccess method
const handlePaymentMethodSuccess = async (data: any) => {
  setShowPaymentForm(false);
  setPaymentError(null);
  
  // Immediately update local state
  const updatedPaymentMethod = data.paymentMethod;
  const newCustomerId = data.customerId;
  
  console.log('Updating with customerId:', newCustomerId);
  // Update both state objects
  setSubscriptionState(prev => prev ? {
    ...prev,
    paymentMethods: [
      ...prev.paymentMethods.filter(m => m.id !== updatedPaymentMethod.id),
      updatedPaymentMethod
    ],
    customerId: data.customerId || prev.customerId
  } : null);

  setSubscriptionData(prev => prev ? {
    ...prev,
    paymentMethods: [
      ...prev.paymentMethods.filter(m => m.id !== updatedPaymentMethod.id),
      updatedPaymentMethod
    ],
    customerId: data.customerId || prev.customerId
  } : null);

  // Force refresh from backend using hostId
  if (subscriptionData?.firebaseUid) {
    await refreshPaymentMethods(subscriptionData.firebaseUid);
  }
};

// 3. Update the handleSetDefaultPayment function to remove customerId dependency:
const handleSetDefaultPayment = async (id: string) => {
  const hostUid = subscriptionData?.firebaseUid;
  
  if (!hostUid) {
    setPaymentError('Host ID is required');
    return;
  }

  try {
    setPaymentError(null);
    
    // Call the backend to update the default payment method using hostUid
    const result = await setDefaultPaymentMethod(hostUid, id);
    
    if (result.success) {
      // Update local state immediately
      if (subscriptionData) {
        setSubscriptionData({
          ...subscriptionData,
          paymentMethods: subscriptionData.paymentMethods.map(m => ({
            ...m,
            isDefault: m.id === id
          }))
        });
      }
      
      setSubscriptionState(prev => prev ? {
        ...prev,
        paymentMethods: prev.paymentMethods.map(m => ({
          ...m,
          isDefault: m.id === id
        }))
      } : null);
      
      setSelectedPaymentMethodId(id);
      
      // Refresh payment methods to ensure consistency
      await refreshPaymentMethods(hostUid);
      
      console.log('Default payment method updated successfully');
    }
  } catch (error) {
    console.error('Failed to set default payment method:', error);
    setPaymentError(error instanceof Error ? error.message : 'Failed to set default payment method');
  }
};

  // Replace your existing handleRemovePaymentMethod with this updated version
const handleRemovePaymentMethod = async (id: string) => {
  const hostUid = subscriptionData?.firebaseUid;
  
  if (!hostUid) {
    setPaymentError('Host ID is required');
    return;
  }

  try {
    setPaymentError(null);
    
    // Call the backend to remove the payment method
    const result = await removePaymentMethod(hostUid, id);
    
    if (result.success) {
      // Update local state immediately
      if (subscriptionData) {
        setSubscriptionData({
          ...subscriptionData,
          paymentMethods: subscriptionData.paymentMethods.filter(m => m.id !== id)
        });
      }
      
      setSubscriptionState(prev => prev ? {
        ...prev,
        paymentMethods: prev.paymentMethods.filter(m => m.id !== id)
      } : null);
      
      // Clear selected payment method if it was the one removed
      if (selectedPaymentMethodId === id) {
        setSelectedPaymentMethodId(null);
      }
      
      // Refresh payment methods to ensure consistency
      await refreshPaymentMethods(hostUid);
      
      console.log('Payment method removed successfully');
    }
  } catch (error) {
    console.error('Failed to remove payment method:', error);
    setPaymentError(error instanceof Error ? error.message : 'Failed to remove payment method');
  }
};

 // 1. Update the handleActivateSubscription function - replace the entire function with this:
const handleActivateSubscription = async () => {
  // If no payment methods exist, show the form immediately
  if (subscriptionState?.paymentMethods.length === 0) {
    setShowPaymentForm(true);
    return;
  }

  setIsProcessingPayment(true);
  setPaymentError(null);

  try {
    // Find selected, default, or first payment method
    const paymentMethod = selectedPaymentMethodId 
                      ? subscriptionState?.paymentMethods.find(m => m.id === selectedPaymentMethodId)
                      : subscriptionState?.paymentMethods.find(m => m.isDefault) 
                      || subscriptionState?.paymentMethods[0];
    
    const paymentMethodId = paymentMethod?.id;
    
    if (!paymentMethodId) throw new Error('No payment method available');
      
    // Use Firebase UID instead of customerId for identification
    const hostUid = subscriptionData?.firebaseUid;
    
    if (!hostUid) {
      console.error('No Firebase UID found');
      throw new Error('User identification not found. Please refresh the page and try again.');
    }

    console.log('Using Firebase UID for identification:', hostUid);
    console.log('Processing payment with method ID:', paymentMethodId);

    // Find the current plan
    const currentPlan = plans.find(plan => plan.name === subscriptionState?.plan);
          
    // Process payment - modified to use hostUid instead of customerId
    const amount = currentPlan?.upfrontCost ? Math.round(currentPlan.upfrontCost) : 2500;
          
    // Update processPayment call to use hostUid
    const paymentResult = await processPayment(
      amount, 
      paymentMethodId,
      hostUid // Use hostUid instead of customerId
    );

    // Call the backend to update the plan status
    if (paymentResult.success && authToken) {
      try {
        const activationResponse = await axios.post(
          `${API_BASE_URL}/hosts/${hostUid}/activate-plan`,
          {
            plan: subscriptionState?.plan,
            paymentIntentId: paymentResult.paymentIntentId,
            hostUid: hostUid // Include hostUid in the request
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );

        console.log('Plan activation response:', activationResponse.data);
        
        // Update local state with the response from backend
        if (activationResponse.data) {
          setSubscriptionState(prev => prev ? {
            ...prev,
            isTrialActive: false,
            billingHistory: prev.billingHistory.map(item => ({
              ...item,
              status: 'paid'
            }))
          } : null);
              
          if (subscriptionData) {
            setSubscriptionData({
              ...subscriptionData,
              isTrialActive: false
            });
          }
        }
      } catch (backendError) {
        console.error('Backend activation error:', backendError);
        setPaymentError('Payment successful but plan update failed. Please contact support.');
        return;
      }
    }

    console.log('Subscription activated successfully');

  } catch (error) {
    console.error('Payment error:', error);
    setPaymentError(error instanceof Error ? error.message : 'Payment failed');
    
    // Update payment status to failed in backend
    if (subscriptionData?.firebaseUid && authToken) {
      try {
        await axios.post(
          `${API_BASE_URL}/hosts/${subscriptionData.firebaseUid}/payment-status`,
          {
            paymentStatus: 'failed',
            hostUid: subscriptionData.firebaseUid // Use hostUid instead of stripeCustomerId
          },
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
      } catch (updateError) {
        console.error('Failed to update payment status:', updateError);
      }
    }
    
    // If payment method doesn't exist, refresh payment methods
    const hostUid = subscriptionData?.firebaseUid;
    if (hostUid) {
      await refreshPaymentMethods(hostUid);
    }
    
    // Show payment form if no valid payment methods
    if (subscriptionState?.paymentMethods.length === 0) {
      setShowPaymentForm(true);
    }
  } finally {
    setIsProcessingPayment(false);
  }
};

  const getFeeTypeLabel = (type: string) => {
    switch(type) {
      case 'setup': return 'Website Setup Fee';
      case 'maintenance': return 'Monthly Maintenance';
      case 'transaction': return 'Transaction Fee';
      default: return type;
    }
  };

 

  if (error) {
    return (
      <section className={styles.currentPlanSection}>
        <div className={styles.errorMessage}>{error}</div>
      </section>
    );
  }

  if (loading || !subscriptionData || !subscriptionState) {
    return (
      <section className={styles.currentPlanSection}>
        <div className={styles.loadingState}></div>
      </section>
    );
  }

  const currentPlan = plans.find(plan => plan.name === subscriptionState.plan);
  
  if (!host) {
    return (
      <div className={styles.errorState}>
        <h2>Dashboard access error</h2>
        <p>{error || "Unable to load host data."}</p>
        <button className={styles.primaryButton} onClick={() => router.push('/login')}>
          Return to login page
        </button>
      </div>
    );
  }

  const handleSetupEarnings = () => {
    router.push('/dashboard/subscription/connect'); // Replace '/finances' with your actual finances page route
  };

  const handleFinances = () => {
    router.push('/dashboard/finances'); // Replace '/finances' with your actual finances page route
  };


  return (
    <div>
     
      <section className={styles.currentPlanSection}>
        <div className={styles.currentPlanCard}>
          <div className={styles.currentPlanHeader}>
            <h2>Current Plan</h2>
            {subscriptionState.isTrialActive && (
              <div className={`${styles.trialBadge} ${trialStatus.className}`}>
                {trialStatus.text}
              </div>
            )}
          </div>
  
          {subscriptionState.isTrialActive && (
            <div className={styles.trialCountdown}>
              <svg className={styles.countdownCircle} width="120" height="120" viewBox="0 0 120 120">
                <circle className={styles.countdownBackground} cx="60" cy="60" r="54" />
                <circle
                  className={styles.countdownProgress}
                  cx="60"
                  cy="60"
                  r="54"
                  strokeDasharray="339.292"
                  strokeDashoffset={339.292 * (1 - trialPercentage / 100)}
                />
              </svg>
              <div className={styles.countdownText}>
                <div className={styles.countdownDays}>{daysLeft}</div>
                <div className={styles.countdownLabel}>days left</div>
              </div>
            </div>
          )}
  
          <div className={styles.currentPlanDetails}>
            <div className={styles.planName}>
              {currentPlan?.name}
            </div>
  
            <div className={styles.planPrice}>
              ${currentPlan?.monthlyCost}
              <span className={styles.billingPeriod}>
                /month
              </span>
            </div>
  
            <p className={styles.planDescription}>
              {currentPlan?.description}
            </p>
  
            {currentPlan?.transactionalDetails && (
              <div className={styles.transactionDetails}>
                <b>Transaction details:</b> {currentPlan.transactionalDetails}
              </div>
            )}
  
            <div className={styles.upfrontCostDisplay}>
              <b>One-time setup fee:</b> ${currentPlan?.upfrontCost}
            </div>
  
            {subscriptionState.isTrialActive ? (
              <button
                className={styles.primaryButton}
                onClick={handleActivateSubscription}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? 'Processing...' : 
                 subscriptionState.paymentMethods.length > 0 ? 'Activate Subscription' : 'Add Payment Method'}
              </button>
            ) : (
              
              <div className={styles.planActions}>
                <h3>Add your bank account details so we can send you your earnings</h3>
                <div className={styles.buttonsRow}>
                <button className={styles.dangerButton} onClick={handleSetupEarnings}>
                  Set Up My Earnings
                </button>
                <button className={styles.dangerButton} onClick={handleFinances}>
                  View my transactions
                </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
  
      {paymentError && (
        <div className={styles.errorMessage}>
          {paymentError}
        </div>
      )}
      
      {showPaymentForm ? (
        <section className={styles.paymentFormSection}>
          <div className={styles.paymentFormCard}>
            <h2>Add Payment Method</h2>
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                onSuccess={handlePaymentMethodSuccess}
                onCancel={() => setShowPaymentForm(false)}
                hostUid={subscriptionData?.firebaseUid!}
              />
            </Elements>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.paymentMethodsSection}>
            <h2>Payment Methods</h2>
            <PaymentMethodsList
              paymentMethods={subscriptionState.paymentMethods}
              onSetDefault={handleSetDefaultPayment}
              onRemove={handleRemovePaymentMethod}
              onAddNew={() => setShowPaymentForm(true)}
            />
            {subscriptionState.paymentMethods.length > 0 && (
              <button 
                className={styles.addPaymentButton}
                onClick={() => setShowPaymentForm(true)}
              >
                Add Another Payment Method
              </button>
            )}
          </section>

          <section className={styles.billingHistorySection}>
            <h2>Billing History</h2>
            <div className={styles.billingHistoryTable}>
              <div className={styles.tableHeader}>
                <div className={styles.tableCell}>Date</div>
                <div className={styles.tableCell}>Type</div>
                <div className={styles.tableCell}>Amount</div>
                <div className={styles.tableCell}>Status</div>
                <div className={styles.tableCell}>Actions</div>
              </div>
              {subscriptionState.billingHistory.map(invoice => (
                <div key={invoice.id} className={styles.tableRow}>
                  <div className={styles.tableCell}>{invoice.date}</div>
                  <div className={styles.tableCell}>{getFeeTypeLabel(invoice.type)}</div>
                  <div className={styles.tableCell}>${invoice.amount}</div>
                  <div className={styles.tableCell}>
                    <span className={`${styles.statusBadge} ${styles[invoice.status]}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                  <div className={styles.tableCell}>
                    <a href={invoice.invoiceUrl} className={styles.downloadLink}>Download</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}