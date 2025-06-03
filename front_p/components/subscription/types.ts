// types.ts
export interface Notification {
  id: number;
  text: string;
  date: string;
  type?: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface PlanDetails {
  id: string;
  name: string;
  monthlyCost: number;
  description: string;
  transactionalDetails?: string;
  upfrontCost: number;
}

export interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl: string;
  type: 'setup' | 'maintenance' | 'transaction';
}

export interface SubscriptionData {
  firebaseUid: string;
  plan: string;
  trialEndsAt: Date;
  isTrialActive: boolean;
  status: string;
  paymentMethods: PaymentMethod[];
  customerId?: string;
}

export interface SubscriptionState {
  plan: string;
  isTrialActive: boolean;
  trialEndsAt: Date;
  paymentMethods: PaymentMethod[];
  billingHistory: BillingHistory[];
  customerId?: string;
}

export interface DashboardDto {
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