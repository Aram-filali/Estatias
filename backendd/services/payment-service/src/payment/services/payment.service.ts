//payment-service\src\payment\payment.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import { PaymentMethodDocument } from '../schemas/payment-method.schema';
import { PaymentIntentDto } from '../dto/payment-intent.dto';
import { VerifyPaymentMethodDto } from '../dto/verify-payment-method.dto';
import { CreatePaymentMethodDto } from '../dto/create-payment-method.dto';
import { PaymentMethodResponse, PaymentMethodsListResponse } from '../interfaces/payment-method.interface';



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

  // payment-service/src/payment/payment.service.ts
  async createPaymentIntent(paymentIntentDto: PaymentIntentDto) {
    try {
      const { amount, paymentMethodId, hostUid } = paymentIntentDto; // Changed from customerId to hostUid

      if (!amount || !paymentMethodId || !hostUid) {
        throw new Error('Amount, payment method ID, and host UID are required');
      }

      // First, find the payment method in our database using hostUid
      let storedPaymentMethod;
      
      // Check if paymentMethodId is a MongoDB ObjectId (24 hex characters)
      if (paymentMethodId.length === 24 && /^[0-9a-f]{24}$/i.test(paymentMethodId)) {
        storedPaymentMethod = await this.paymentMethodModel.findOne({
          _id: paymentMethodId,
          hostUid: hostUid
        });
      } else {
        // It might be a Stripe payment method ID, look it up by stripePaymentMethodId
        storedPaymentMethod = await this.paymentMethodModel.findOne({
          stripePaymentMethodId: paymentMethodId,
          hostUid: hostUid
        });
      }

      if (!storedPaymentMethod) {
        throw new Error('Payment method not found');
      }

      const stripePaymentMethodId = storedPaymentMethod.stripePaymentMethodId;
      const customerId = storedPaymentMethod.customerId;

      // Verify payment method exists in Stripe
      let paymentMethod;
      try {
        paymentMethod = await this.stripe.paymentMethods.retrieve(stripePaymentMethodId);
      } catch (error) {
        if (error.code === 'resource_missing') {
          throw new Error('Payment method not found in Stripe');
        }
        throw error;
      }

      // Check if payment method is attached to customer
      if (paymentMethod.customer !== customerId) {
        try {
          if (paymentMethod.customer) {
            await this.stripe.paymentMethods.detach(stripePaymentMethodId);
          }
          
          await this.stripe.paymentMethods.attach(stripePaymentMethodId, {
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
        payment_method: stripePaymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          plan_type: 'premium',
          setup_fee: 'true',
          hostUid: hostUid // Add hostUid to metadata
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

 // Updated Payment Service Methods
// Update your existing savePaymentMethod to use hostUid
async savePaymentMethod(createDto: CreatePaymentMethodDto) {
  try {
    const { paymentMethodId, customerId, hostUid } = createDto;

    if (!paymentMethodId) {
      throw { error: 'Payment method ID is required' };
    }

    if (!hostUid) {
      throw { error: 'Host UID is required' };
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
    
    // Handle customer creation/retrieval logic (same as before)
    if (customerId) {
      try {
        const customer = await this.stripe.customers.retrieve(customerId);
        if (typeof customer === 'string' || customer.deleted) {
          throw { error: 'Customer was deleted' };
        }
        stripeCustomer = customer;
      } catch (stripeError) {
        this.logger.error(`Error retrieving customer: ${JSON.stringify(stripeError)}`);
        
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
      try {
        stripeCustomer = await this.stripe.customers.create();
      } catch (createError) {
        throw { 
          error: 'Failed to create customer',
          details: createError
        };
      }
    }

    // Attach payment method to customer (same logic as before)
    if (stripePaymentMethod.customer !== stripeCustomer.id) {
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

    // Check if this is the first payment method for this host
    const existingPaymentMethods = await this.paymentMethodModel.find({ hostUid });
    const isFirstPaymentMethod = existingPaymentMethods.length === 0;

    // Prepare payment method data
    const paymentMethodData = {
      stripePaymentMethodId: paymentMethodId,
      hostUid: hostUid,
      customerId: stripeCustomer.id,
      type: stripePaymentMethod.type,
      isDefault: isFirstPaymentMethod, // Set as default only if it's the first one
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

    // Save or update payment method
    let paymentMethod;
    try {
      paymentMethod = await this.paymentMethodModel.findOneAndUpdate(
        { stripePaymentMethodId: paymentMethodId, hostUid: hostUid },
        paymentMethodData,
        { new: true, upsert: true }
      ).lean();

      // If this is the first payment method, set it as default in Stripe as well
      if (isFirstPaymentMethod) {
        try {
          await this.stripe.customers.update(stripeCustomer.id, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          });
        } catch (updateError) {
          this.logger.warn(`Failed to set Stripe default payment method: ${JSON.stringify(updateError)}`);
          // Don't throw here as the main operation was successful
        }
      }

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
    throw {
      error: error.error || error.message || 'Failed to save payment method',
      details: error.details || error
    };
  }
}

// Update your existing getPaymentMethods to use hostUid
async getPaymentMethods(hostUid: string): Promise<PaymentMethodsListResponse> {
  try {
    if (!hostUid) {
      throw new Error('Host UID is required');
    }

    this.logger.log('Fetching payment methods for hostUid:', hostUid);

    // Get payment methods from database by hostUid
    const paymentMethods = await this.paymentMethodModel.find({
      hostUid
    }).lean().sort({ createdAt: 1 }); // Sort by creation date, oldest first

    this.logger.log('Found payment methods in DB:', paymentMethods.length);

    // Get unique customer IDs to fetch from Stripe
    const customerIds = [...new Set(paymentMethods.map(pm => pm.customerId).filter(Boolean))];
    
    let allStripePaymentMethods: Stripe.PaymentMethod[] = [];
    
    // Fetch payment methods from Stripe for each customer
    for (const customerId of customerIds) {
      try {
        const stripePaymentMethods = await this.stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
        });
        allStripePaymentMethods.push(...stripePaymentMethods.data);
      } catch (stripeError) {
        this.logger.warn(`Failed to fetch Stripe payment methods for customer ${customerId}:`, stripeError);
      }
    }

    // Merge results - prioritize DB records but include Stripe data
    const mergedMethods: PaymentMethodResponse[] = [];
    
    for (const pm of paymentMethods) {
      const stripePm = allStripePaymentMethods.find(spm => spm.id === pm.stripePaymentMethodId);
      
      mergedMethods.push({
        id: pm._id.toString(),
        stripePaymentMethodId: pm.stripePaymentMethodId,
        type: pm.type,
        details: stripePm && stripePm.type === 'card' ? {
          brand: stripePm.card?.brand || pm.details?.brand,
          lastFour: stripePm.card?.last4 || pm.details?.lastFour,
          expiryMonth: stripePm.card?.exp_month || pm.details?.expiryMonth,
          expiryYear: stripePm.card?.exp_year || pm.details?.expiryYear
        } : {
          brand: pm.details?.brand,
          lastFour: pm.details?.lastFour,
          expiryMonth: pm.details?.expiryMonth,
          expiryYear: pm.details?.expiryYear,
          email: pm.details?.email
        },
        isDefault: pm.isDefault
      });
    }

    this.logger.log('Returning merged payment methods:', mergedMethods.length);

    return {
      paymentMethods: mergedMethods
    };
  } catch (error) {
    this.logger.error('Error fetching payment methods:', error);
    throw { error: error.message || 'Failed to fetch payment methods' };
  }
}

// Add this new method to your PaymentService class
async setDefaultPaymentMethod(hostUid: string, paymentMethodId: string) {
  try {
    this.logger.log(`Setting default payment method for hostUid: ${hostUid}, paymentMethodId: ${paymentMethodId}`);

    if (!hostUid) {
      throw { error: 'Host UID is required' };
    }

    if (!paymentMethodId) {
      throw { error: 'Payment method ID is required' };
    }

    // First, verify the payment method exists and belongs to this host
    const paymentMethod = await this.paymentMethodModel.findOne({
      hostUid,
      _id: paymentMethodId
    }).lean();

    if (!paymentMethod) {
      throw { 
        error: 'Payment method not found or does not belong to this host' 
      };
    }

    // Set all payment methods for this host to not default
    await this.paymentMethodModel.updateMany(
      { hostUid },
      { $set: { isDefault: false } }
    );

    // Set the selected payment method as default
    const updatedPaymentMethod = await this.paymentMethodModel.findByIdAndUpdate(
      paymentMethodId,
      { $set: { isDefault: true } },
      { new: true }
    ).lean();

    if (!updatedPaymentMethod) {
    throw { error: 'Payment method not found after update' };
  }

    // Also update Stripe customer's default payment method if customerId exists
    if (paymentMethod.customerId && paymentMethod.stripePaymentMethodId) {
      try {
        await this.stripe.customers.update(paymentMethod.customerId, {
          invoice_settings: {
            default_payment_method: paymentMethod.stripePaymentMethodId,
          },
        });
        this.logger.log(`Updated Stripe customer default payment method: ${paymentMethod.customerId}`);
      } catch (stripeError) {
        this.logger.warn(`Failed to update Stripe default payment method: ${JSON.stringify(stripeError)}`);
        // Don't throw here as the DB update was successful
      }
    }

    return {
      success: true,
      paymentMethod: {
        id: updatedPaymentMethod._id.toString(),
        stripePaymentMethodId: updatedPaymentMethod.stripePaymentMethodId,
        type: updatedPaymentMethod.type,
        details: updatedPaymentMethod.details,
        isDefault: updatedPaymentMethod.isDefault
      }
    };
  } catch (error) {
    this.logger.error('Error setting default payment method:', error);
    throw {
      error: error.error || error.message || 'Failed to set default payment method',
      details: error.details || error
    };
  }
}



// Add this method to your PaymentService class
async removePaymentMethod(hostUid: string, paymentMethodId: string) {
  try {
    this.logger.log(`Removing payment method for hostUid: ${hostUid}, paymentMethodId: ${paymentMethodId}`);

    if (!hostUid) {
      throw { error: 'Host UID is required' };
    }

    if (!paymentMethodId) {
      throw { error: 'Payment method ID is required' };
    }

    // First, verify the payment method exists and belongs to this host
    const paymentMethod = await this.paymentMethodModel.findOne({
      hostUid,
      _id: paymentMethodId
    }).lean();

    if (!paymentMethod) {
      throw { 
        error: 'Payment method not found or does not belong to this host' 
      };
    }

    // Check if this is the default payment method
    const isDefault = paymentMethod.isDefault;

    // Remove from Stripe first if we have the Stripe payment method ID
    if (paymentMethod.stripePaymentMethodId) {
      try {
        await this.stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
        this.logger.log(`Detached Stripe payment method: ${paymentMethod.stripePaymentMethodId}`);
      } catch (stripeError) {
        this.logger.warn(`Failed to detach Stripe payment method: ${JSON.stringify(stripeError)}`);
        // Continue with database removal even if Stripe detach fails
      }
    }

    // Remove from database
    await this.paymentMethodModel.findByIdAndDelete(paymentMethodId);
    this.logger.log(`Removed payment method from database: ${paymentMethodId}`);

    // If this was the default payment method, set another one as default (if any exist)
    if (isDefault) {
      const remainingMethods = await this.paymentMethodModel.find({ hostUid }).lean();
      if (remainingMethods.length > 0) {
        await this.paymentMethodModel.findByIdAndUpdate(
          remainingMethods[0]._id,
          { $set: { isDefault: true } }
        );
        this.logger.log(`Set new default payment method: ${remainingMethods[0]._id}`);
      }
    }

    return {
      success: true,
      message: 'Payment method removed successfully'
    };
  } catch (error) {
    this.logger.error('Error removing payment method:', error);
    throw {
      error: error.error || error.message || 'Failed to remove payment method',
      details: error.details || error
    };
  }
}
}