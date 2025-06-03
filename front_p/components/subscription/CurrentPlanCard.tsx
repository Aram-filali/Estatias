'use client';

import styles from 'app/dashboard/subscription/subscription.module.css';
import { PlanDetails, SubscriptionState } from './types';

interface CurrentPlanCardProps {
  plan: PlanDetails | undefined;
  subscriptionState: SubscriptionState;
  trialStatus: { text: string; className: string };
  trialPercentage: number;
  daysLeft: number;
  isProcessingPayment: boolean;
  handleActivateSubscription: () => void;
}

export default function CurrentPlanCard({
  plan,
  subscriptionState,
  trialStatus,
  trialPercentage,
  daysLeft,
  isProcessingPayment,
  handleActivateSubscription
}: CurrentPlanCardProps) {
  return (
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
          {plan?.name}
        </div>

        <div className={styles.planPrice}>
          ${plan?.monthlyCost}
          <span className={styles.billingPeriod}>
            /month
          </span>
        </div>

        <p className={styles.planDescription}>
          {plan?.description}
        </p>

        {plan?.transactionalDetails && (
          <div className={styles.transactionDetails}>
            <b>Transaction details:</b> {plan.transactionalDetails}
          </div>
        )}

        <div className={styles.upfrontCostDisplay}>
          <b>One-time setup fee:</b> ${plan?.upfrontCost}
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
            <button className={styles.secondaryButton} disabled>
              Change Plan
            </button>
            <button className={styles.dangerButton}>
              Cancel Subscription
            </button>
          </div>
        )}
      </div>
    </div>
  );
}