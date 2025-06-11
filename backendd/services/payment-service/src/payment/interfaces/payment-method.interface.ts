// src/payment/interfaces/payment-method.interface.ts
export interface PaymentMethodDetails {
  brand?: string;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  email?: string;
}

export interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  customerId: string;
  type: string;
  details: PaymentMethodDetails;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethodResponse {
  id: string;
  stripePaymentMethodId: string;
  type: string;
  details: PaymentMethodDetails;
  isDefault: boolean;
}

export interface PaymentMethodsListResponse {
  paymentMethods: PaymentMethodResponse[];
}