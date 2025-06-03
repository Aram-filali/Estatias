// app/api/stripe/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { amount, paymentMethodId, customerId } = await request.json();
    
    if (!amount || !paymentMethodId || !customerId) {
      return NextResponse.json(
        { error: 'Amount, payment method ID, and customer ID are required' },
        { status: 400 }
      );
    }
    
    // Verify payment method exists and is attached to customer
    let paymentMethod;
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'Payment method not found', code: 'payment_method_not_found' },
          { status: 400 }
        );
      }
      throw error;
    }
    
    // Check if the payment method is attached to the customer
    if (paymentMethod.customer !== customerId) {
      try {
        // If attached to another customer, detach first
        if (paymentMethod.customer) {
          await stripe.paymentMethods.detach(paymentMethodId);
        }
        
        // Now attach to our customer
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: 'Could not attach payment method to customer', code: 'attachment_failed' },
          { status: 400 }
        );
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'eur',
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        plan_type: 'premium', // or get from request
        setup_fee: 'true'
      }
    });

    if (paymentIntent.status === 'requires_action') {
      // Handle authentication required
      return NextResponse.json({ 
        success: false,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    }
    
    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment status: ${paymentIntent.status}`);
    }

    return NextResponse.json({ 
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    });
    
  } catch (error: any) {
    console.error('Stripe error:', error);
    
    // Detailed error handling for better debugging
    let errorMessage = error.message || 'Payment failed';
    let errorCode = error.code || 'payment_failed';
    
    // Handle common Stripe errors
    if (error.type === 'StripeCardError') {
      errorMessage = error.message || 'Card was declined';
      errorCode = error.code || 'card_declined';
    } else if (error.type === 'StripeInvalidRequestError') {
      if (error.param === 'payment_method') {
        errorMessage = 'Invalid payment method';
        errorCode = 'invalid_payment_method';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode
      },
      { status: 400 }
    );
  }
}