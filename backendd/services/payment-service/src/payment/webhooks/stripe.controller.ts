/*import { Controller, Post, Body, Headers, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import * as Stripe from 'stripe';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      this.logger.log('Received Stripe webhook');

      // Verify webhook signature
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        this.logger.error(`Webhook signature verification failed: ${err.message}`);
        throw new HttpException('Invalid signature', HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`Processing webhook event: ${event.type}`);

      // Process the webhook event
      const result = await this.paymentService.handleStripeWebhook(event);

      return {
        statusCode: 200,
        message: 'Webhook processed successfully',
        received: true,
      };

    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}*/