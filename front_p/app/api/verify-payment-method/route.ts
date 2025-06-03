// app/api/verify-payment-method/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { paymentMethodId, customerId } = await request.json();
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { isValid: false, reason: 'missing_payment_method_id' },
        { status: 400 }
      );
    }
    
    // Check if payment method exists
    let paymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error: any) {
      // If payment method doesn't exist
      if (error.code === 'resource_missing') {
        return NextResponse.json(
          { isValid: false, reason: 'not_found' },
          { status: 200 }
        );
      }
      throw error;
    }
    
    // Check if attached to the correct customer
    if (customerId && paymentMethod.customer !== customerId) {
      // Try to attach the payment method to the customer
      try {
        // If attached to another customer, detach first
        if (paymentMethod.customer) {
          await stripe.paymentMethods.detach(paymentMethodId);
        }
        
        // Attach to our customer
        paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } catch (error) {
        return NextResponse.json(
          { isValid: false, reason: 'cannot_attach_to_customer' },
          { status: 200 }
        );
      }
    }

    // Additional checks based on payment method type
    if (paymentMethod.type === 'card') {
      const expYear = paymentMethod.card?.exp_year || 0;
      const expMonth = paymentMethod.card?.exp_month || 0;
      
      // Create date object for card expiration (last day of month)
      const cardExpiry = new Date(expYear, expMonth, 0); // Day 0 is the last day of previous month
      const now = new Date();
      
      if (cardExpiry < now) {
        return NextResponse.json(
          { isValid: false, reason: 'card_expired' },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({ 
      isValid: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        details: paymentMethod.type === 'card' ? {
          brand: paymentMethod.card?.brand,
          lastFour: paymentMethod.card?.last4,
          expiryDate: `${paymentMethod.card?.exp_month}/${paymentMethod.card?.exp_year}`
        } : null
      }
    });
    
  } catch (error: any) {
    console.error('Error verifying payment method:', error);
    return NextResponse.json(
      { isValid: false, reason: 'verification_error', error: error.message },
      { status: 200 }
    );
  }
}