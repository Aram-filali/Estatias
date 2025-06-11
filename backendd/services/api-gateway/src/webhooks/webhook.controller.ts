// webhook.controller.ts (API Gateway) - Improved version
import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';
import { Request } from 'express';
import Stripe from 'stripe';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly stripe: Stripe;

  constructor(
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });
  }

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new HttpException(
        'Webhook secret not configured',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    this.logger.log('🎯 Stripe webhook endpoint hit');
    
    const rawBody = req.body;
    this.logger.log(`Raw body type: ${typeof rawBody}, length: ${rawBody?.length || 0}`);
    this.logger.log(`Signature present: ${!!signature}`);

    let event: Stripe.Event;

    try {
      if (!rawBody || rawBody.length === 0) {
        throw new Error('Request body is empty');
      }

      if (!signature) {
        throw new Error('Stripe signature header is missing');
      }

      // Ensure rawBody is a Buffer
      const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
      
      event = this.stripe.webhooks.constructEvent(bodyBuffer, signature, endpointSecret);
      this.logger.log('✅ Webhook signature verified successfully');
      this.logger.log(`Event ID: ${event.id}, Type: ${event.type}, Created: ${new Date(event.created * 1000)}`);
    } catch (err) {
      this.logger.error(`❌ Webhook signature verification failed: ${err.message}`);
      throw new HttpException(
        `Webhook signature verification failed: ${err.message}`,
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          this.logger.log('🔄 Processing checkout.session.completed');
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'payment_intent.succeeded':
          this.logger.log('🔄 Processing payment_intent.succeeded');
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          this.logger.log('🔄 Processing payment_intent.payment_failed');
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'checkout.session.expired':
          this.logger.log('🔄 Processing checkout.session.expired');
          await this.handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
          break;

        default:
          this.logger.log(`ℹ️ Unhandled event type: ${event.type}`);
      }

      this.logger.log(`✅ Successfully processed webhook event: ${event.type} (${event.id})`);
      return { received: true, eventType: event.type, eventId: event.id };
    } catch (error) {
      this.logger.error(`❌ Error processing webhook: ${error.message}`, error.stack);
      throw new HttpException(
        'Error processing webhook',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    this.logger.log(`🎉 Checkout session completed: ${session.id}`);
    this.logger.log(`Session details:`, {
      id: session.id,
      payment_status: session.payment_status,
      payment_intent: session.payment_intent,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email,
      metadata: session.metadata,
    });

    try {
      // Step 1: Update payment status in payment service
      this.logger.log(`📝 Updating payment status for session: ${session.id}`);
      const paymentUpdateResult = await firstValueFrom(
        this.paymentClient.send('update_payment_status', {
          paymentIntentId: session.id,
          status: 'paid',
          metadata: {
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amountTotal: session.amount_total,
            currency: session.currency,
            customerEmail: session.customer_details?.email,
            paymentStatus: session.payment_status,
            webhookProcessedAt: new Date().toISOString(),
          }
        }).pipe(timeout(10000))
      );

      this.logger.log(`Payment update result:`, paymentUpdateResult);

      if (paymentUpdateResult.statusCode !== 200) {
        this.logger.error(`❌ Failed to update payment status: ${paymentUpdateResult.message}`);
        throw new Error(`Payment update failed: ${paymentUpdateResult.message}`);
      }

      // Step 2: Get the updated payment record
      const paymentRecord = paymentUpdateResult.data;
      if (!paymentRecord) {
        this.logger.error(`❌ No payment record returned from update`);
        throw new Error('No payment record returned from update');
      }

      this.logger.log(`✅ Payment record updated:`, {
        id: paymentRecord._id,
        bookingId: paymentRecord.bookingId,
        status: paymentRecord.status,
        amount: paymentRecord.amount,
      });

      // Step 3: Send booking_paid event to booking service
      const bookingPaymentData = {
        bookingId: paymentRecord.bookingId,
        paymentId: String(paymentRecord._id),
        hostId: paymentRecord.hostId,
        guestId: paymentRecord.guestId,
        amount: paymentRecord.amount,
        platformFeeAmount: paymentRecord.platformFeeAmount || 0,
        hostAmount: paymentRecord.hostAmount,
        currency: paymentRecord.currency,
        plan: paymentRecord.plan,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent,
        paidAt: new Date().toISOString(),
        billingDetails: {
          customerEmail: session.customer_details?.email,
          customerName: session.customer_details?.name,
          paymentMethod: session.payment_method_types?.[0] || 'card',
          receiptUrl: session.payment_intent ? 
            `https://dashboard.stripe.com/payments/${session.payment_intent}` : null,
        }
      };

      this.logger.log(`📤 Sending booking_paid event to booking service:`, bookingPaymentData);

      // Use emit for fire-and-forget or send for response
      const bookingResult = await firstValueFrom(
        this.bookingClient.send('booking_paid', bookingPaymentData).pipe(timeout(15000))
      );

      this.logger.log(`Booking service response:`, bookingResult);

      if (bookingResult && bookingResult.statusCode !== 200) {
        this.logger.error(`❌ Booking service error: ${bookingResult.message}`);
        // Don't throw here - payment is already processed
      } else {
        this.logger.log(`✅ booking_paid event processed successfully for booking: ${paymentRecord.bookingId}`);
      }

    } catch (error) {
      this.logger.error(`❌ Error in handleCheckoutSessionCompleted: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`💰 Payment intent succeeded: ${paymentIntent.id}`);

    try {
      const result = await firstValueFrom(
        this.paymentClient.send('update_payment_status', {
          paymentIntentId: paymentIntent.id,
          status: 'paid',
          metadata: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            paymentMethodId: paymentIntent.payment_method,
            transferData: paymentIntent.transfer_data,
            applicationFeeAmount: paymentIntent.application_fee_amount,
            webhookProcessedAt: new Date().toISOString(),
          }
        }).pipe(timeout(10000))
      );

      this.logger.log(`✅ Payment updated successfully for intent: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`❌ Error handling payment intent succeeded: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`❌ Payment intent failed: ${paymentIntent.id}`);

    try {
      const result = await firstValueFrom(
        this.paymentClient.send('update_payment_status', {
          paymentIntentId: paymentIntent.id,
          status: 'failed',
          metadata: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            failureCode: paymentIntent.last_payment_error?.code,
            failureMessage: paymentIntent.last_payment_error?.message,
            failureType: paymentIntent.last_payment_error?.type,
            webhookProcessedAt: new Date().toISOString(),
          }
        }).pipe(timeout(10000))
      );

      if (result.statusCode === 200 && paymentIntent.metadata?.bookingId) {
        // Notify booking service about failed payment
        await firstValueFrom(
          this.bookingClient.send('booking_payment_failed', {
            bookingId: paymentIntent.metadata.bookingId,
            paymentId: paymentIntent.metadata.paymentRecordId,
            reason: paymentIntent.last_payment_error?.message || 'Payment failed',
            failureCode: paymentIntent.last_payment_error?.code,
          }).pipe(timeout(10000))
        );
        this.logger.log(`booking_payment_failed event sent for booking: ${paymentIntent.metadata.bookingId}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error handling payment intent failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
    this.logger.log(`⏰ Checkout session expired: ${session.id}`);

    try {
      const result = await firstValueFrom(
        this.paymentClient.send('update_payment_status', {
          paymentIntentId: session.id,
          status: 'cancelled',
          metadata: {
            sessionId: session.id,
            expiresAt: session.expires_at,
            webhookProcessedAt: new Date().toISOString(),
            reason: 'session_expired',
          }
        }).pipe(timeout(10000))
      );

      if (result.statusCode === 200 && session.metadata?.bookingId) {
        await firstValueFrom(
          this.bookingClient.send('booking_payment_expired', {
            bookingId: session.metadata.bookingId,
            paymentId: session.metadata.paymentRecordId,
            reason: 'checkout_session_expired',
          }).pipe(timeout(10000))
        );
        this.logger.log(`booking_payment_expired event sent for booking: ${session.metadata.bookingId}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error handling checkout session expired: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('test')
  testEndpoint() {
    this.logger.log('🧪 Webhook test endpoint called');
    return { 
      message: 'Webhook controller is working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
}