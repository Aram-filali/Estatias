// app/api/payment-methods/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Verify customer exists
    try {
      const customerCheck = await stripe.customers.retrieve(customerId);
      if (typeof customerCheck === 'string' || customerCheck.deleted) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get default payment method with proper typing
    const customerResponse = await stripe.customers.retrieve(
      customerId,
      {
        expand: ['invoice_settings.default_payment_method']
      }
    ) as Stripe.Customer & {
      invoice_settings?: {
        default_payment_method?: string | Stripe.PaymentMethod;
      }
    };
    
    let defaultPaymentMethodId = null;
    if (customerResponse.invoice_settings?.default_payment_method) {
      const defaultMethod = customerResponse.invoice_settings.default_payment_method;
      defaultPaymentMethodId = typeof defaultMethod === 'string' 
        ? defaultMethod 
        : defaultMethod.id;
    }

    // Get all payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return NextResponse.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        details: {
          brand: pm.card?.brand,
          lastFour: pm.card?.last4,
          expiryDate: `${pm.card?.exp_month}/${pm.card?.exp_year}`
        },
        isDefault: pm.id === defaultPaymentMethodId
      }))
    });
    
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}