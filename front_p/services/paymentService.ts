// services/paymentService.ts
import { PaymentMethod } from 'components/payment/PaymentMethodsList';


// Base API URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface PaymentMethodResponse {
  success: boolean;
  paymentMethod: PaymentMethod;
  customerId: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentIntentId: string;
  status: string;
}

export interface PaymentMethodsListResponse {
  paymentMethods: PaymentMethod[];
}

export interface PaymentError {
  error: string;
  code: string;
}

export async function createPaymentMethod(paymentMethodId: string, customerId?: string): Promise<PaymentMethodResponse> {
  const response = await fetch(`${API_BASE_URL}/payments/methods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentMethodId,
      customerId: customerId || null
    })
  });

  if (!response.ok) {
    const errorData = await response.json() as PaymentError;
    throw new Error(errorData.error || 'Failed to save payment method');
  }

  return await response.json() as PaymentMethodResponse;
}

/*export async function savePaymentMethod(paymentMethodId: string, customerId?: string): Promise<PaymentMethodResponse> {
  const response = await fetch('/api/save-payment-method', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId, customerId })
  });

  if (!response.ok) {
    const errorData = await response.json() as PaymentError;
    throw new Error(errorData.error || 'Failed to save payment method');
  }

  return await response.json() as PaymentMethodResponse;
}*/

export async function verifyPaymentMethod(paymentMethodId: string, customerId?: string): Promise<{isValid: boolean, reason?: string, paymentMethod?: any}> {
  const response = await fetch(`${API_BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId, customerId })
  });

  if (!response.ok) {
    throw new Error('Failed to verify payment method');
  }

  return await response.json();
}

export async function processPayment(amount: number, paymentMethodId: string, customerId: string): Promise<PaymentResponse> {
  const response = await fetch(`${API_BASE_URL}/payments/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      paymentMethodId,
      customerId
    })
  });

  if (!response.ok) {
    const errorData = await response.json() as PaymentError;
    throw new Error(errorData.error || 'Payment failed');
  }

  return await response.json() as PaymentResponse;
}

export async function fetchPaymentMethods(customerId: string): Promise<PaymentMethodsListResponse> {
  const response = await fetch(`${API_BASE_URL}/payments/methods?customerId=${customerId}`);
  
  if (!response.ok) {
    const errorData = await response.json() as PaymentError;
    throw new Error(errorData.error || 'Failed to fetch payment methods');
  }

  return await response.json() as PaymentMethodsListResponse;
}