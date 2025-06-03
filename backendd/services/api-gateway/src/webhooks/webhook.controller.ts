// webhook.controller.ts (API Gateway)
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
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import Stripe from 'stripe';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly stripe: Stripe;

  constructor(
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy, // Add this
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

    console.log('✅ Stripe webhook endpoint hit');

    let event: Stripe.Event;

    try {
      const rawBody = req.body;

      if (!rawBody) {
        throw new Error('Request body is empty');
      }

      if (!signature) {
        throw new Error('Stripe signature header is missing');
      }

      const bodyToVerify = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
      event = this.stripe.webhooks.constructEvent(bodyToVerify, signature, endpointSecret);
      console.log('✅ Webhook signature verified successfully');
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new HttpException(
        `Webhook signature verification failed: ${err.message}`,
        HttpStatus.BAD_REQUEST
      );
    }

    this.logger.log(`Received webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      this.logger.log(`Successfully processed webhook event: ${event.type}`);
      return { received: true, eventType: event.type, eventId: event.id };
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
      throw new HttpException(
        'Error processing webhook',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    this.logger.log(`Checkout session completed: ${session.id}`);

    try {
      // First, update payment status in payment service
      const paymentResult = await firstValueFrom(
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
        })
      );

      if (paymentResult.statusCode !== 200) {
        this.logger.error(`Failed to update payment status: ${paymentResult.message}`);
        return;
      }

      // Get the full payment record to send complete data to booking service
      const paymentRecord = paymentResult.data;
      
      // Now send booking_paid event to booking service
      const bookingPaymentData = {
        bookingId: paymentRecord.bookingId,
        paymentId: String(paymentRecord._id),
        hostId: paymentRecord.hostId,
        guestId: paymentRecord.guestId,
        amount: paymentRecord.amount,
        platformFeeAmount: paymentRecord.platformFeeAmount,
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
          receiptUrl: session.payment_intent ? `https://dashboard.stripe.com/payments/${session.payment_intent}` : null,
        }
      };

      // Send event to booking service
      await firstValueFrom(
        this.bookingClient.emit('booking_paid', bookingPaymentData)
      );

      this.logger.log(`booking_paid event sent to booking service for booking: ${paymentRecord.bookingId}`);
      this.logger.log(`Payment updated successfully for session: ${session.id}`);

    } catch (error) {
      this.logger.error(`Error handling checkout session completed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`);

    try {
      await firstValueFrom(
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
        })
      );

      this.logger.log(`Payment updated successfully for intent: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment intent succeeded: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment intent failed: ${paymentIntent.id}`);

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
        })
      );

      if (result.statusCode === 200 && paymentIntent.metadata?.bookingId) {
        // Notify booking service about failed payment
        await firstValueFrom(
          this.bookingClient.emit('booking_payment_failed', {
            bookingId: paymentIntent.metadata.bookingId,
            paymentId: paymentIntent.metadata.paymentRecordId,
            reason: paymentIntent.last_payment_error?.message || 'Payment failed',
            failureCode: paymentIntent.last_payment_error?.code,
          })
        );
        this.logger.log(`booking_payment_failed event sent for booking: ${paymentIntent.metadata.bookingId}`);
      }
    } catch (error) {
      this.logger.error(`Error handling payment intent failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
    this.logger.log(`Checkout session expired: ${session.id}`);

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
        })
      );

      if (result.statusCode === 200 && session.metadata?.bookingId) {
        // Notify booking service about expired session
        await firstValueFrom(
          this.bookingClient.emit('booking_payment_expired', {
            bookingId: session.metadata.bookingId,
            paymentId: session.metadata.paymentRecordId,
            reason: 'checkout_session_expired',
          })
        );
        this.logger.log(`booking_payment_expired event sent for booking: ${session.metadata.bookingId}`);
      }
    } catch (error) {
      this.logger.error(`Error handling checkout session expired: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('test')
  testEndpoint() {
    return { message: 'Webhook controller is working' };
  }
}