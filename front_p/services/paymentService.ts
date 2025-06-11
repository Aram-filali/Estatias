// Updated services/paymentService.ts
import { PaymentMethod } from 'components/payment/PaymentMethodsList';

// Base API URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface PaymentMethodResponse {
  success: boolean;
  paymentMethod: PaymentMethod;
  customerId: string;
  hostUid: string;
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
  code?: string;
}

// Helper function to create PaymentError objects
function createPaymentError(error: string, code: string = 'UNKNOWN_ERROR'): PaymentError {
  return { error, code };
}

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json() as PaymentError;
        errorMessage = errorData.error || errorMessage;
      } else {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }
    } catch (parseError) {
      console.warn('Could not parse error response:', parseError);
    }
    
    throw new Error(errorMessage);
  }
  
  return await response.json() as T;
}

export async function createPaymentMethod(
  paymentMethodId: string, 
  hostUid: string, 
  customerId?: string
): Promise<PaymentMethodResponse> {
  console.log('Creating payment method:', { paymentMethodId, hostUid, customerId });
  
  if (!paymentMethodId) {
    throw new Error('Payment method ID is required');
  }
  
  if (!hostUid) {
    throw new Error('Host UID is required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/payments/methods`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethodId,
        hostUid,
        customerId: customerId || undefined
      })
    });

    const result = await handleApiResponse<PaymentMethodResponse>(response);
    console.log('Payment method created successfully:', result);
    return result;

  } catch (error) {
    console.error('Error creating payment method:', error);
    throw error;
  }
}

export async function verifyPaymentMethod(
  paymentMethodId: string, 
  customerId?: string
): Promise<{isValid: boolean, reason?: string, paymentMethod?: any}> {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethodId, customerId })
    });

    return await handleApiResponse(response);
  } catch (error) {
    console.error('Error verifying payment method:', error);
    throw new Error('Failed to verify payment method');
  }
}

// services/paymentService.ts
export async function processPayment(
  amount: number, 
  paymentMethodId: string, 
  hostUid: string // Changed from customerId to hostUid
): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        paymentMethodId,
        hostUid // Changed from customerId to hostUid
      })
    });

    return await handleApiResponse<PaymentResponse>(response);
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

export async function fetchPaymentMethods(hostUid: string): Promise<PaymentMethodsListResponse> {
  console.log('fetchPaymentMethods called with hostUid:', hostUid);
  
  if (!hostUid) {
    throw new Error('Host UID is required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/payments/methods?hostUid=${hostUid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Payment methods fetch response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Payment methods fetch error:', errorText);
      
      let errorData: PaymentError;
      try {
        errorData = JSON.parse(errorText) as PaymentError;
      } catch {
        errorData = createPaymentError(
          `HTTP ${response.status}: ${errorText}`,
          `HTTP_${response.status}`
        );
      }
      
      throw new Error(errorData.error || `Failed to fetch payment methods (${response.status})`);
    }

    const result = await response.json() as PaymentMethodsListResponse;
    console.log('Payment methods fetched successfully:', result);
    return result;
  } catch (error) {
    console.error('fetchPaymentMethods error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error while fetching payment methods');
  }
}


// Add this new function to your paymentService.ts
export async function setDefaultPaymentMethod(hostUid: string, paymentMethodId: string): Promise<{success: boolean, paymentMethod: PaymentMethod}> {
  console.log('Setting default payment method:', { hostUid, paymentMethodId });
  
  if (!hostUid) {
    throw new Error('Host UID is required');
  }
  
  if (!paymentMethodId) {
    throw new Error('Payment method ID is required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/payments/methods/default`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostUid,
        paymentMethodId
      })
    });

    console.log('Set default payment method response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Set default payment method error:', errorText);
      
      let errorData: PaymentError;
      try {
        errorData = JSON.parse(errorText) as PaymentError;
      } catch {
        errorData = createPaymentError(
          `HTTP ${response.status}: ${errorText}`,
          `HTTP_${response.status}`
        );
      }
      
      throw new Error(errorData.error || `Failed to set default payment method (${response.status})`);
    }

    const result = await response.json();
    console.log('Default payment method set successfully:', result);
    return result;
  } catch (error) {
    console.error('setDefaultPaymentMethod error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error while setting default payment method');
  }
}

// Add this function to your paymentService.ts
export async function removePaymentMethod(hostUid: string, paymentMethodId: string): Promise<{success: boolean}> {
  console.log('Removing payment method:', { hostUid, paymentMethodId });
  
  if (!hostUid) {
    throw new Error('Host UID is required');
  }
  
  if (!paymentMethodId) {
    throw new Error('Payment method ID is required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/payments/methods/${paymentMethodId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostUid
      })
    });

    console.log('Remove payment method response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remove payment method error:', errorText);
      
      let errorData: PaymentError;
      try {
        errorData = JSON.parse(errorText) as PaymentError;
      } catch {
        errorData = createPaymentError(
          `HTTP ${response.status}: ${errorText}`,
          `HTTP_${response.status}`
        );
      }
      
      throw new Error(errorData.error || `Failed to remove payment method (${response.status})`);
    }

    const result = await response.json();
    console.log('Payment method removed successfully:', result);
    return result;
  } catch (error) {
    console.error('removePaymentMethod error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error while removing payment method');
  }
}