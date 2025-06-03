// app/api/save-payment-method/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { paymentMethodId, customerId } = await request.json();
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }
    
    // Verify the PaymentMethod exists
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    let customer;
    
    // If customer ID was provided, retrieve it
    if (customerId) {
      try {
        customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          throw new Error('Customer was deleted');
        }
      } catch (error) {
        // If customer doesn't exist, create a new one
        customer = await stripe.customers.create();
      }
    } else {
      // Create new customer if none provided
      customer = await stripe.customers.create();
    }
    
    if (typeof customer === 'string') {
      throw new Error('Invalid customer object returned');
    }

    // Check if payment method is already attached to the customer
    let isAttached = false;
    if (paymentMethod.customer === customer.id) {
      isAttached = true;
    } else {
      // If already attached to a different customer, detach first
      if (paymentMethod.customer) {
        await stripe.paymentMethods.detach(paymentMethodId);
      }
      
      // Now attach to our customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });
    }

    // Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Return payment method details for client
    return NextResponse.json({ 
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        details: paymentMethod.type === 'card' ? {
          brand: paymentMethod.card?.brand,
          lastFour: paymentMethod.card?.last4,
          expiryDate: `${paymentMethod.card?.exp_month}/${paymentMethod.card?.exp_year}`,
        } : null,
        isDefault: true
      },
      customerId: customer.id
    });
    
  } catch (error: any) {
    console.error('Error saving payment method:', error);
    
    // Provide more specific error messages based on Stripe errors
    let errorMessage = error.message || 'Failed to save payment method';
    let statusCode = 500;
    
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        errorMessage = 'The payment method does not exist or has been deleted';
        statusCode = 404;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}