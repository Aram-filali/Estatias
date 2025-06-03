// src/payment/services/connect.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConnectAccount, ConnectAccountDocument } from '../schemas/connect-account.schema';
import { BookingPayment, BookingPaymentDocument } from '../schemas/booking-payment.schema';
import { CreateCheckoutSessionDto, PaymentStatus } from '../dto/create-checkout-session.dto';
import Stripe from 'stripe';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

@Injectable()
export class ConnectService {
  private readonly logger = new Logger(ConnectService.name);
  private readonly stripe: Stripe;
  private readonly platformFeePercentage = 0.05;

  constructor(

    @InjectModel(ConnectAccount.name) private connectAccountModel: Model<ConnectAccountDocument>,
    @InjectModel(BookingPayment.name) private bookingPaymentModel: Model<BookingPaymentDocument>,
    @Inject('BOOKING_SERVICE') private readonly bookingService: ClientProxy, // ✅
  ) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined');
    }

    this.stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16' as any,
    });
  }

  async createConnectAccount(firebaseUid: string) {
    try {
      // Check if the user already has a Connect account
      const existingAccount = await this.connectAccountModel.findOne({ firebaseUid });
      if (existingAccount) {
        return {
          statusCode: 200,
          data: {
            accountId: existingAccount.stripeConnectAccountId,
            detailsSubmitted: existingAccount.detailsSubmitted,
            payoutsEnabled: existingAccount.payoutsEnabled,
            accountLink: existingAccount.accountLink,
          },
        };
      }

      // Create a new Express account
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'FR', // Default country, can be changed
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          firebaseUid,
        },
      });

      // Create onboarding link
      const accountLink = await this.stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.FRONTEND_URL}/dashboard/connect/refresh`,
        return_url: `${process.env.FRONTEND_URL}/dashboard/connect/complete`,
        type: 'account_onboarding',
      });

      // Save to database
      const newConnectAccount = new this.connectAccountModel({
        firebaseUid,
        stripeConnectAccountId: account.id,
        accountLink: accountLink.url,
      });
      await newConnectAccount.save();

      return {
        statusCode: 201,
        data: {
          accountId: account.id,
          detailsSubmitted: false,
          payoutsEnabled: false,
          accountLink: accountLink.url,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create connect account: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: 'Failed to create Connect account',
      };
    }
  }

  async getConnectAccount(firebaseUid: string) {
    try {
      const connectAccount = await this.connectAccountModel.findOne({ firebaseUid });
      if (!connectAccount) {
        return {
          statusCode: 404,
          message: 'Connect account not found',
        };
      }

      // Get the latest account status from Stripe
      const stripeAccount = await this.stripe.accounts.retrieve(
        connectAccount.stripeConnectAccountId
      );

      // Update the database record
      connectAccount.detailsSubmitted = stripeAccount.details_submitted;
      connectAccount.payoutsEnabled = stripeAccount.payouts_enabled;
      await connectAccount.save();

      return {
        statusCode: 200,
        data: {
          accountId: connectAccount.stripeConnectAccountId,
          detailsSubmitted: connectAccount.detailsSubmitted,
          payoutsEnabled: connectAccount.payoutsEnabled,
          bankAccount: connectAccount.bankAccount,
          accountStatus: stripeAccount.requirements,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to retrieve connect account: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: 'Failed to retrieve Connect account',
      };
    }
  }

  async refreshAccountLink(firebaseUid: string) {
    try {
      const connectAccount = await this.connectAccountModel.findOne({ firebaseUid });
      if (!connectAccount) {
        return {
          statusCode: 404,
          message: 'Connect account not found',
        };
      }

      const accountLink = await this.stripe.accountLinks.create({
        account: connectAccount.stripeConnectAccountId,
        refresh_url: `${process.env.FRONTEND_URL}/dashboard/connect/refresh`,
        return_url: `${process.env.FRONTEND_URL}/dashboard/connect/complete`,
        type: 'account_onboarding',
      });

      connectAccount.accountLink = accountLink.url;
      await connectAccount.save();

      return {
        statusCode: 200,
        data: {
          accountLink: accountLink.url,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to refresh account link: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: 'Failed to refresh account link',
      };
    }
  }



  async createCheckoutSession(createCheckoutDto: CreateCheckoutSessionDto) {
  try {
    this.logger.log(`Starting checkout session creation for booking: ${createCheckoutDto.bookingId}`);
    this.logger.log(`Payload received:`, createCheckoutDto);

    // Get host's Connect account
    this.logger.log(`Searching for Connect account with firebaseUid: ${createCheckoutDto.hostId}`);
    const hostConnectAccount = await this.connectAccountModel.findOne({
      firebaseUid: createCheckoutDto.hostId
    });

    if (!hostConnectAccount) {
      this.logger.warn(`Host Connect account not found for hostId: ${createCheckoutDto.hostId}`);
      return {
        statusCode: 404,
        message: 'Host Connect account not found',
      };
    }

    this.logger.log(`Found Connect account:`, {
      id: hostConnectAccount._id,
      stripeAccountId: hostConnectAccount.stripeConnectAccountId,
      payoutsEnabled: hostConnectAccount.payoutsEnabled
    });

    if (!hostConnectAccount.payoutsEnabled) {
      this.logger.warn(`Host account payouts not enabled for hostId: ${createCheckoutDto.hostId}`);
      return {
        statusCode: 400,
        message: 'Host account is not ready to receive payments',
      };
    }

    // Calculate platform fee and host amount based on plan
    let platformFeeAmount = 0;
    let hostAmount = createCheckoutDto.amount;

    // Only charge platform fee for Standard Plan
    if (createCheckoutDto.plan === 'Standard Plan') {
      platformFeeAmount = Math.round(createCheckoutDto.amount * this.platformFeePercentage);
      hostAmount = createCheckoutDto.amount - platformFeeAmount;
    } else if (createCheckoutDto.plan === 'Premium Plan') {
      // Premium Plan: Host gets full amount, no platform fee
      platformFeeAmount = 0;
      hostAmount = createCheckoutDto.amount;
    }

    this.logger.log(`Payment calculation:`, {
      totalAmount: createCheckoutDto.amount,
      plan: createCheckoutDto.plan,
      platformFeePercentage: this.platformFeePercentage,
      platformFeeAmount,
      hostAmount
    });

    // Create payment record in database
    this.logger.log(`Creating payment record in database...`);
    const paymentRecord = new this.bookingPaymentModel({
      hostId: createCheckoutDto.hostId,
      bookingId: createCheckoutDto.bookingId,
      guestId: createCheckoutDto.guestId,
      amount: createCheckoutDto.amount,
      plan: createCheckoutDto.plan,
      currency: createCheckoutDto.currency,
      status: PaymentStatus.PENDING,
      platformFeeAmount,
      hostAmount,
      stripeConnectAccountId: hostConnectAccount.stripeConnectAccountId,
      metadata: {
        createdVia: 'checkout_session',
        planType: createCheckoutDto.plan,
      }
    });

    const savedPaymentRecord = await paymentRecord.save();
    this.logger.log(`Payment record created with ID: ${savedPaymentRecord._id}`);

    // Validate environment variables
    if (!process.env.FRONTEND_URL2) {
      this.logger.error('FRONTEND_URL2 environment variable is not set');
      throw new Error('FRONTEND_URL2 environment variable is not set');
    }

    this.logger.log(`Environment check - FRONTEND_URL2: ${process.env.FRONTEND_URL2}`);

    // Create Stripe Checkout Session configuration
    this.logger.log(`Creating Stripe checkout session...`);
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: createCheckoutDto.currency as any,
            product_data: {
              name: `Booking Payment - ${createCheckoutDto.plan.toUpperCase()}`,
              description: `Payment for booking ${createCheckoutDto.bookingId}`,
            },
            unit_amount: createCheckoutDto.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment' as const,
      success_url: `${process.env.FRONTEND_URL2}/payments/success`,
      cancel_url: `${process.env.FRONTEND_URL2}/payments/cancel`,
      client_reference_id: String(savedPaymentRecord._id),
      metadata: {
        bookingId: createCheckoutDto.bookingId,
        hostId: createCheckoutDto.hostId,
        guestId: createCheckoutDto.guestId,
        paymentRecordId: String(savedPaymentRecord._id),
        plan: createCheckoutDto.plan,
      },
    };

    // Add payment intent data for connected accounts (only if there's a platform fee or transfer needed)
    if (platformFeeAmount > 0) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: hostConnectAccount.stripeConnectAccountId,
        },
        metadata: {
          bookingId: createCheckoutDto.bookingId,
          hostId: createCheckoutDto.hostId,
          guestId: createCheckoutDto.guestId,
          paymentRecordId: String(savedPaymentRecord._id),
          plan: createCheckoutDto.plan,
        },
      };
    } else {
      // For Premium Plan, transfer full amount to connected account
      sessionConfig.payment_intent_data = {
        transfer_data: {
          destination: hostConnectAccount.stripeConnectAccountId,
        },
        metadata: {
          bookingId: createCheckoutDto.bookingId,
          hostId: createCheckoutDto.hostId,
          guestId: createCheckoutDto.guestId,
          paymentRecordId: String(savedPaymentRecord._id),
          plan: createCheckoutDto.plan,
        },
      };
    }

    this.logger.log(`Stripe session config:`, sessionConfig);

    const session = await this.stripe.checkout.sessions.create(sessionConfig);
    this.logger.log(`Stripe session created successfully:`, {
      id: session.id,
      url: session.url
    });

    // Update payment record with session ID
    savedPaymentRecord.stripeSessionId = session.id;
    await savedPaymentRecord.save();
    this.logger.log(`Payment record updated with session ID: ${session.id}`);

    const response = {
      statusCode: 201,
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
        paymentId: String(savedPaymentRecord._id),
        amount: createCheckoutDto.amount,
        platformFee: platformFeeAmount,
        hostAmount: hostAmount,
        currency: createCheckoutDto.currency,
      },
    };

    this.logger.log(`Checkout session creation completed successfully:`, response);
    return response;

  } catch (error) {
    this.logger.error(`Failed to create checkout session - Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      type: error.type,
      statusCode: error.statusCode,
      raw: error
    });

    // Handle specific Stripe errors
    if (error.type && error.type.startsWith('Stripe')) {
      this.logger.error(`Stripe-specific error:`, {
        type: error.type,
        code: error.code,
        message: error.message,
        param: error.param,
        statusCode: error.statusCode
      });
      
      return {
        statusCode: 400,
        message: `Payment processing error: ${error.message}`,
        error: error.message,
      };
    }

    // Handle database errors
    if (error.name === 'ValidationError' || error.name === 'MongoError') {
      this.logger.error(`Database error:`, error);
      return {
        statusCode: 400,
        message: 'Database validation error',
        error: error.message,
      };
    }

    return {
      statusCode: 500,
      message: 'Failed to create checkout session',
      error: error.message,
    };
  }
}

  async updatePaymentStatus(paymentIntentId: string, status: PaymentStatus, metadata?: any) {
    try {
      const payment = await this.bookingPaymentModel.findOne({
        $or: [
          { stripePaymentIntentId: paymentIntentId },
          { stripeSessionId: paymentIntentId }
        ]
      });

      if (!payment) {
        this.logger.warn(`Payment not found for intent: ${paymentIntentId}`);
        return {
          statusCode: 404,
          message: 'Payment record not found',
        };
      }

      const updateData: any = { status };
      
      if (status === PaymentStatus.PAID) {
        updateData.paidAt = new Date();
        if (!payment.stripePaymentIntentId && metadata?.paymentIntentId) {
          updateData.stripePaymentIntentId = metadata.paymentIntentId;
        }
      } else if (status === PaymentStatus.FAILED) {
        updateData.failedAt = new Date();
        if (metadata?.failureReason) {
          updateData.failureReason = metadata.failureReason;
        }
      }

      if (metadata) {
        updateData.metadata = { ...payment.metadata, ...metadata };
      }

      const updatedPayment = await this.bookingPaymentModel.findByIdAndUpdate(
        payment._id,
        updateData,
        { new: true }
      );

      return {
        statusCode: 200,
        data: updatedPayment,
      };
    } catch (error) {
      this.logger.error(`Failed to update payment status: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: 'Failed to update payment status',
      };
    }
  }

  async getPayment(paymentId: string) {
    try {
      const payment = await this.bookingPaymentModel.findById(paymentId);
      if (!payment) {
        return {
          statusCode: 404,
          message: 'Payment not found',
        };
      }

      return {
        statusCode: 200,
        data: payment,
      };
    } catch (error) {
      this.logger.error(`Failed to get payment: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: 'Failed to get payment',
      };
    }
  }

  
}