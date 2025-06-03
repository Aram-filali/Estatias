//payment-service\src\payment\payment.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { PaymentMethodDocument } from '../schemas/payment-method.schema';
import { PaymentIntentDto } from '../dto/payment-intent.dto';
import { VerifyPaymentMethodDto } from '../dto/verify-payment-method.dto';
import { CreatePaymentMethodDto } from '../dto/create-payment-method.dto';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel('PaymentMethod') 
    private paymentMethodModel: Model<PaymentMethodDocument>,
   
  ) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16' as any,
    });
  }

  async verifyPaymentMethod(verifyDto: VerifyPaymentMethodDto) {
    try {
      const { paymentMethodId, customerId } = verifyDto;
      
      if (!paymentMethodId) {
        return { isValid: false, reason: 'missing_payment_method_id' };
      }

      // First, check if this is a MongoDB ID (not a Stripe ID)
      if (paymentMethodId.length === 24 && /^[0-9a-f]{24}$/i.test(paymentMethodId)) {
        // This is a MongoDB ID, look up the actual Stripe payment method ID
        this.logger.log(`Looking up Stripe payment method for database ID: ${paymentMethodId}`);
        
        const storedPaymentMethod = await this.paymentMethodModel.findById(paymentMethodId);
        
        if (!storedPaymentMethod) {
          return { isValid: false, reason: 'not_found_in_database' };
        }
        
        // Replace the ID with the actual Stripe payment method ID
        return this.verifyStripePaymentMethod(
          storedPaymentMethod.stripePaymentMethodId,
          customerId
        );
      }
      
      // If it's already a Stripe ID (starts with pm_), use it directly
      return this.verifyStripePaymentMethod(paymentMethodId, customerId);
    } catch (error) {
      this.logger.error('Error verifying payment method:', error);
      return { isValid: false, reason: 'verification_error', error: error.message };
    }
  }
  
  private async verifyStripePaymentMethod(stripePaymentMethodId: string, customerId?: string) {
    try {
      // Check if payment method exists in Stripe
      let paymentMethod;
      try {
        this.logger.log(`Retrieving Stripe payment method: ${stripePaymentMethodId}`);
        paymentMethod = await this.stripe.paymentMethods.retrieve(stripePaymentMethodId);
      } catch (error) {
        if (error.code === 'resource_missing') {
          return { isValid: false, reason: 'not_found' };
        }
        throw error;
      }

      // Check if attached to the correct customer
      if (customerId && paymentMethod.customer !== customerId) {
        try {
          // If attached to another customer, detach first
          if (paymentMethod.customer) {
            await this.stripe.paymentMethods.detach(stripePaymentMethodId);
          }
          
          // Attach to our customer
          paymentMethod = await this.stripe.paymentMethods.attach(stripePaymentMethodId, {
            customer: customerId,
          });
        } catch (error) {
          return { isValid: false, reason: 'cannot_attach_to_customer' };
        }
      }

      // Additional checks based on payment method type
      if (paymentMethod.type === 'card') {
        const expYear = paymentMethod.card?.exp_year || 0;
        const expMonth = paymentMethod.card?.exp_month || 0;
        
        const cardExpiry = new Date(expYear, expMonth, 0);
        const now = new Date();
        
        if (cardExpiry < now) {
          return { isValid: false, reason: 'card_expired' };
        }
      }

      return { 
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
      };
    } catch (error) {
      this.logger.error('Error verifying Stripe payment method:', error);
      return { isValid: false, reason: 'stripe_verification_error', error: error.message };
    }
  }

  async createPaymentIntent(paymentIntentDto: PaymentIntentDto) {
    try {
      const { amount, paymentMethodId, customerId } = paymentIntentDto;

      if (!amount || !paymentMethodId || !customerId) {
        throw new Error('Amount, payment method ID, and customer ID are required');
      }

      // Verify payment method exists and is attached to customer
      let paymentMethod;
      try {
        paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      } catch (error) {
        if (error.code === 'resource_missing') {
          throw new Error('Payment method not found');
        }
        throw error;
      }

      // Check if payment method is attached to customer
      if (paymentMethod.customer !== customerId) {
        try {
          if (paymentMethod.customer) {
            await this.stripe.paymentMethods.detach(paymentMethodId);
          }
          
          await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
          });
        } catch (error) {
          throw new Error('Could not attach payment method to customer');
        }
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'eur',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          plan_type: 'premium',
          setup_fee: 'true'
        }
      });

      if (paymentIntent.status === 'requires_action') {
        return { 
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id
        };
      }
      
      if (paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment status: ${paymentIntent.status}`);
      }

      return { 
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      };
    } catch (error) {
      this.logger.error('Stripe error:', error);
      
      let errorMessage = error.message || 'Payment failed';
      let errorCode = error.code || 'payment_failed';
      
      if (error.type === 'StripeCardError') {
        errorMessage = error.message || 'Card was declined';
        errorCode = error.code || 'card_declined';
      } else if (error.type === 'StripeInvalidRequestError') {
        if (error.param === 'payment_method') {
          errorMessage = 'Invalid payment method';
          errorCode = 'invalid_payment_method';
        }
      }
      
      throw { error: errorMessage, code: errorCode };
    }
  }

 async savePaymentMethod(createDto: CreatePaymentMethodDto) {
  try {
    const { paymentMethodId, customerId } = createDto;

    if (!paymentMethodId) {
      throw { error: 'Payment method ID is required' };
    }

    // Verify the PaymentMethod exists in Stripe
    let stripePaymentMethod;
    try {
      stripePaymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (stripeError) {
      this.logger.error(`Stripe error retrieving payment method: ${JSON.stringify(stripeError)}`);
      throw { 
        error: 'The payment method does not exist or has been deleted',
        details: stripeError
      };
    }
    
    let stripeCustomer: Stripe.Customer;
    
    // If customer ID was provided, retrieve it
    if (customerId) {
      try {
        const customer = await this.stripe.customers.retrieve(customerId);
        if (typeof customer === 'string' || customer.deleted) {
          throw { error: 'Customer was deleted' };
        }
        stripeCustomer = customer;
      } catch (stripeError) {
        this.logger.error(`Error retrieving customer: ${JSON.stringify(stripeError)}`);
        
        // If customer doesn't exist, create a new one
        try {
          stripeCustomer = await this.stripe.customers.create();
        } catch (createError) {
          throw { 
            error: 'Failed to create customer',
            details: createError
          };
        }
      }
    } else {
      // Create new customer if none provided
      try {
        stripeCustomer = await this.stripe.customers.create();
      } catch (createError) {
        throw { 
          error: 'Failed to create customer',
          details: createError
        };
      }
    }

    // Check if payment method is already attached to the customer
    let isAttached = false;
    if (stripePaymentMethod.customer === stripeCustomer.id) {
      isAttached = true;
    } else {
      // If already attached to a different customer, detach first
      if (stripePaymentMethod.customer) {
        try {
          await this.stripe.paymentMethods.detach(paymentMethodId);
        } catch (detachError) {
          throw { 
            error: 'Failed to detach payment method from previous customer',
            details: detachError
          };
        }
      }
      
      // Now attach to our customer
      try {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomer.id,
        });
      } catch (attachError) {
        throw { 
          error: 'Failed to attach payment method to customer',
          details: attachError
        };
      }
    }

    // Set as default payment method
    try {
      await this.stripe.customers.update(stripeCustomer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (updateError) {
      throw { 
        error: 'Failed to set as default payment method',
        details: updateError
      };
    }

    // Prepare payment method data
    const paymentMethodData = {
      stripePaymentMethodId: paymentMethodId,
      customerId: stripeCustomer.id,
      type: stripePaymentMethod.type,
      isDefault: true,
      details: {} as {
        brand?: string;
        lastFour?: string;
        expiryMonth?: number;
        expiryYear?: number;
        email?: string;
      }
    };

    // Handle different payment method types
    if (stripePaymentMethod.type === 'card') {
      paymentMethodData.details = {
        brand: stripePaymentMethod.card?.brand,
        lastFour: stripePaymentMethod.card?.last4,
        expiryMonth: stripePaymentMethod.card?.exp_month,
        expiryYear: stripePaymentMethod.card?.exp_year
      };
    } else if (stripePaymentMethod.type === 'paypal') {
      paymentMethodData.details = {
        email: (stripePaymentMethod as any).paypal?.email
      };
    }

    // Check if payment method already exists in our database
    let paymentMethod;
    try {
      paymentMethod = await this.paymentMethodModel.findOneAndUpdate(
        { stripePaymentMethodId: paymentMethodId },
        paymentMethodData,
        { new: true, upsert: true }
      ).lean();

      // Update all other payment methods for this customer to not be default
      await this.paymentMethodModel.updateMany(
        { 
          customerId: stripeCustomer.id,
          _id: { $ne: (paymentMethod as any)._id }
        },
        { $set: { isDefault: false } }
      );
    } catch (dbError) {
      this.logger.error(`Database error: ${JSON.stringify(dbError)}`);
      throw { 
        error: 'Failed to save payment method to database',
        details: dbError
      };
    }

    return { 
      success: true,
      paymentMethod: {
        id: (paymentMethod as any)._id.toString(),
        stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
        type: paymentMethod.type,
        details: paymentMethod.details,
        isDefault: paymentMethod.isDefault
      },
      customerId: stripeCustomer.id
    };
  } catch (error) {
    this.logger.error('Error saving payment method:', error);
    
    // Ensure we're returning a structured error
    throw {
      error: error.error || error.message || 'Failed to save payment method',
      details: error.details || error
    };
  }
}

  async getPaymentMethods(customerId: string) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      // Verify customer exists in Stripe
      try {
        const customerCheck = await this.stripe.customers.retrieve(customerId);
        if (typeof customerCheck === 'string' || customerCheck.deleted) {
          throw new Error('Customer not found');
        }
      } catch (error) {
        throw new Error('Customer not found');
      }

      // Get default payment method from Stripe
      const customerResponse = await this.stripe.customers.retrieve(
        customerId,
        {
          expand: ['invoice_settings.default_payment_method']
        }
      ) as Stripe.Customer & {
        invoice_settings?: {
          default_payment_method?: string | Stripe.PaymentMethod;
        }
      };
      
      let defaultPaymentMethodId: string | null = null;
      if (customerResponse.invoice_settings?.default_payment_method) {
        const defaultMethod = customerResponse.invoice_settings.default_payment_method;
        defaultPaymentMethodId = typeof defaultMethod === 'string' 
          ? defaultMethod 
          : defaultMethod.id;
      }

      // Get payment methods from our database
      const paymentMethods = await this.paymentMethodModel.find({
        customerId
      }).lean().sort({ createdAt: -1 });

      // Also get from Stripe to ensure sync
      const stripePaymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      // Merge results
      const mergedMethods = paymentMethods.map(pm => ({
        id: pm._id.toString(),
        stripePaymentMethodId: pm.stripePaymentMethodId,
        type: pm.type,
        details: pm.details || {},
        isDefault: pm.stripePaymentMethodId === defaultPaymentMethodId
      }));

      // Add any Stripe methods not in our DB
      for (const stripePm of stripePaymentMethods.data) {
        if (!paymentMethods.some(pm => pm.stripePaymentMethodId === stripePm.id)) {
          mergedMethods.push({
            id: stripePm.id,
            stripePaymentMethodId: stripePm.id,
            type: stripePm.type,
            details: stripePm.type === 'card' ? {
              brand: stripePm.card?.brand,
              lastFour: stripePm.card?.last4,
              expiryMonth: stripePm.card?.exp_month,
              expiryYear: stripePm.card?.exp_year
            } : {},
            isDefault: stripePm.id === defaultPaymentMethodId
          });
        }
      }

      return { 
        paymentMethods: mergedMethods
      };
    } catch (error) {
      this.logger.error('Error fetching payment methods:', error);
      throw { error: error.message || 'Failed to fetch payment methods' };
    }
  }
}