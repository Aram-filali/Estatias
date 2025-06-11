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
      this.logger.log(`Getting connect account for user: ${firebaseUid}`);
      
      if (!firebaseUid) {
        return {
          statusCode: 400,
          message: 'Firebase UID is required',
          data: null
        };
      }

      const connectAccount = await this.connectAccountModel
        .findOne({ firebaseUid })
        .lean()
        .exec();

      if (!connectAccount) {
        this.logger.log(`No connect account found for user: ${firebaseUid}`);
        return {
          statusCode: 404,
          message: 'Connect account not found',
          data: null
        };
      }

      // Transform the data to match expected structure
      const accountData = {
        accountId: connectAccount.stripeConnectAccountId,
        detailsSubmitted: connectAccount.detailsSubmitted || false,
        payoutsEnabled: connectAccount.payoutsEnabled || false,
        bankAccount: connectAccount.bankAccount || null
      };

      this.logger.log(`Found connect account for user: ${firebaseUid}`);

      return {
        statusCode: 200,
        message: 'Connect account retrieved successfully',
        data: accountData,
      };

    } catch (error) {
      this.logger.error(`Failed to get connect account: ${error.message}`, error.stack);
      
      return {
        statusCode: 500,
        message: `Failed to get connect account: ${error.message}`,
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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




  // Additional methods for Connect Service in Payment Microservice

  async getHostTransactions(payload: {
    firebaseUid: string;
    timeframe?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      this.logger.log(`Processing getHostTransactions for user: ${payload.firebaseUid}`);
      
      const { firebaseUid, timeframe, status, limit = 50, offset = 0 } = payload;
      
      // Validate required parameters
      if (!firebaseUid) {
        this.logger.error('Firebase UID is required');
        return {
          statusCode: 400,
          message: 'Firebase UID is required',
          data: null
        };
      }

      // Build query filters
      const query: any = { hostId: firebaseUid };
      
      this.logger.log(`Building query with hostId: ${firebaseUid}`);
      
      // Apply status filter
      if (status && status !== 'all') {
        query.status = status.toUpperCase();
        this.logger.log(`Applied status filter: ${status.toUpperCase()}`);
      }
      
      // Apply timeframe filter
      if (timeframe && timeframe !== 'allTime') {
        const now = new Date();
        let startDate: Date;
        
        switch (timeframe) {
          case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            query.createdAt = { $gte: startDate };
            break;
          case 'lastMonth':
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            query.createdAt = { 
              $gte: lastMonthStart, 
              $lt: thisMonthStart 
            };
            break;
          case 'last3Months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            query.createdAt = { $gte: startDate };
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            query.createdAt = { $gte: startDate };
        }
        
        this.logger.log(`Applied timeframe filter: ${timeframe}, query:`, query.createdAt);
      }

      this.logger.log(`Final query:`, JSON.stringify(query));

      // Get transactions with pagination
      const transactions = await this.bookingPaymentModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(offset))
        .lean() // Use lean() for better performance
        .exec();

      this.logger.log(`Found ${transactions.length} transactions`);

      // Get total count for pagination
      const totalCount = await this.bookingPaymentModel.countDocuments(query);
      this.logger.log(`Total count: ${totalCount}`);

      // Calculate summary statistics - separate queries for reliability
      const [completedTransactions, pendingTransactions] = await Promise.all([
        this.bookingPaymentModel
          .find({ hostId: firebaseUid, status: 'PAID' })
          .select('hostAmount')
          .lean()
          .exec(),
        this.bookingPaymentModel
          .find({ hostId: firebaseUid, status: 'PENDING' })
          .select('hostAmount')
          .lean()
          .exec()
      ]);

      const totalRevenue = completedTransactions.reduce((sum, t) => {
        const amount = t.hostAmount || 0;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);

      const pendingRevenue = pendingTransactions.reduce((sum, t) => {
        const amount = t.hostAmount || 0;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);

      const responseData = {
        transactions: transactions || [],
        pagination: {
          total: totalCount || 0,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: (Number(offset) + Number(limit)) < totalCount
        },
        summary: {
          totalRevenue: totalRevenue || 0,
          pendingRevenue: pendingRevenue || 0,
          totalTransactions: completedTransactions.length || 0,
          pendingTransactions: pendingTransactions.length || 0
        }
      };

      this.logger.log(`Returning response with ${responseData.transactions.length} transactions`);

      return {
        statusCode: 200,
        message: 'Transactions retrieved successfully',
        data: responseData,
      };

    } catch (error) {
      this.logger.error(`Failed to get host transactions: ${error.message}`, error.stack);
      this.logger.error(`Error details:`, error);
      
      return {
        statusCode: 500,
        message: `Failed to get host transactions: ${error.message}`,
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  async requestManualPayout(payload: {
    firebaseUid: string;
    amount?: number;
  }) {
    try {
      this.logger.log(`Processing manual payout request for user: ${payload.firebaseUid}`);
      
      const { firebaseUid, amount } = payload;
      
      if (!firebaseUid) {
        return {
          statusCode: 400,
          message: 'Firebase UID is required',
          data: null
        };
      }
      
      // Get host's Connect account
      const connectAccount = await this.connectAccountModel
        .findOne({ firebaseUid })
        .lean()
        .exec();

      if (!connectAccount) {
        this.logger.log(`Connect account not found for user: ${firebaseUid}`);
        return {
          statusCode: 404,
          message: 'Connect account not found. Please set up your payout method first.',
          data: null
        };
      }

      if (!connectAccount.payoutsEnabled) {
        return {
          statusCode: 400,
          message: 'Payouts are not enabled for this account. Please complete account setup.',
          data: null
        };
      }

      // Calculate available balance
      const completedTransactions = await this.bookingPaymentModel
        .find({
          hostId: firebaseUid,
          status: 'PAID'
        })
        .select('hostAmount')
        .lean()
        .exec();

      const availableBalance = completedTransactions.reduce((sum, t) => {
        const amount = t.hostAmount || 0;
        return sum + (typeof amount === 'number' ? amount : 0);
      }, 0);
      
      this.logger.log(`Available balance for ${firebaseUid}: ${availableBalance}`);
      
      if (availableBalance < 10000) { // $100 minimum in cents
        return {
          statusCode: 400,
          message: 'Insufficient balance for payout. Minimum payout amount is $100.',
          data: { availableBalance: availableBalance / 100 }
        };
      }

      const payoutAmount = amount ? amount * 100 : availableBalance; // Convert to cents if amount provided
      
      if (payoutAmount > availableBalance) {
        return {
          statusCode: 400,
          message: 'Payout amount exceeds available balance',
          data: { 
            requestedAmount: payoutAmount / 100,
            availableBalance: availableBalance / 100
          }
        };
      }

      // Create transfer in Stripe (not payout, since this is for Connect accounts)
      const transfer = await this.stripe.transfers.create({
        amount: payoutAmount,
        currency: 'usd',
        destination: connectAccount.stripeConnectAccountId,
        description: `Manual payout requested by host ${firebaseUid}`,
        metadata: {
          hostId: firebaseUid,
          type: 'manual_payout',
          requestedAt: new Date().toISOString()
        }
      });

      // Log the payout request
      this.logger.log(`Manual transfer created:`, {
        transferId: transfer.id,
        amount: payoutAmount,
        hostId: firebaseUid,
        connectAccountId: connectAccount.stripeConnectAccountId
      });

      return {
        statusCode: 200,
        message: 'Manual payout requested successfully',
        data: {
          transferId: transfer.id,
          amount: payoutAmount / 100, // Convert back to dollars
          currency: transfer.currency,
          estimatedArrival: 'Within 2-3 business days',
          status: 'requested'
        },
      };

    } catch (error) {
      this.logger.error(`Failed to request manual payout: ${error.message}`, error.stack);
      
      // Handle Stripe errors
      if (error.type && error.type.startsWith('Stripe')) {
        return {
          statusCode: 400,
          message: `Payout failed: ${error.message}`,
          data: null
        };
      }

      return {
        statusCode: 500,
        message: `Failed to request manual payout: ${error.message}`,
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  
  }
  
}