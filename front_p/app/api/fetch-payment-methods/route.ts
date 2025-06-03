// app/api/fetch-payment-methods/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PaymentMethod } from 'components/payment/PaymentMethodsList';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  // Get customerId from the URL query parameters
  const url = new URL(request.url);
  const customerId = url.searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json(
      { error: 'Customer ID is required' },
      { status: 400 }
    );
  }

  try {
    // Retrieve the customer with expanded default payment method
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method']
    });

    if (typeof customer === 'string' || customer.deleted) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get the default payment method ID
    const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method as string | null;

    // List all payment methods for the customer
    const paymentMethodsList = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card' // You can expand this to include other types like 'paypal'
    });

    // Format the payment methods for the client
    const paymentMethods: PaymentMethod[] = paymentMethodsList.data.map(pm => ({
      id: pm.id,
      type: pm.type as 'card' | 'paypal',
      details: pm.type === 'card' ? {
        brand: pm.card?.brand,
        lastFour: pm.card?.last4,
        expiryDate: `${pm.card?.exp_month}/${pm.card?.exp_year}`,
      } : {},
      isDefault: pm.id === defaultPaymentMethodId
    }));

    return NextResponse.json({
      paymentMethods
    });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    
    let errorMessage = error.message || 'Failed to fetch payment methods';
    let statusCode = 500;
    
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        errorMessage = 'Customer not found';
        statusCode = 404;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}