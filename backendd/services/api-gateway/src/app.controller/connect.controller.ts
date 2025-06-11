// api-gateway/src/app.controller/connect.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Query,
  Logger,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';

@Controller('connect')
export class ConnectController {
  private readonly logger = new Logger(ConnectController.name);

  constructor(
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('HOST_SERVICE') private readonly hostClient: ClientProxy,
  ) {}

  

  private async callPaymentService(pattern: string, data: any, operation: string) {
    try {
      this.logger.log(`Calling payment service - Pattern: ${pattern}, Operation: ${operation}`);
      this.logger.log(`Data being sent:`, JSON.stringify(data));

      const result = await this.paymentClient.send(pattern, data).toPromise();
      
      this.logger.log(`Payment service raw response:`, JSON.stringify(result));

      // Ensure we always return a properly structured response
      if (!result) {
        this.logger.error(`Payment service returned null/undefined for ${operation}`);
        return {
          statusCode: 500,
          message: `No response from payment service for ${operation}`,
          data: null
        };
      }

      // If the result doesn't have statusCode, it might be the raw data
      if (typeof result.statusCode === 'undefined') {
        this.logger.warn(`Payment service response missing statusCode for ${operation}, wrapping result`);
        return {
          statusCode: 200,
          message: `${operation} completed`,
          data: result
        };
      }

      return result;

    } catch (error) {
      this.logger.error(`Payment service call failed for ${operation}: ${error.message}`, error.stack);
      
      return {
        statusCode: 500,
        message: `Payment service error for ${operation}: ${error.message}`,
        data: null,
        error: error.message
      };
    }
  }



  @Get('health-check')
  async healthCheck() {
    const response = await firstValueFrom(
      this.paymentClient.send('health_check', {})
    );
    return response;
  }

  @Get('payment-service/health')
  async checkPaymentServiceHealth() {
    try {
      const result = await firstValueFrom(
        this.paymentClient.send('health_check', {}).pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.error(`Payment service health check failed: ${error.message}`);
            return of({ 
              status: 'error', 
              message: 'Payment service unavailable',
              error: error.code || error.message 
            });
          })
        )
      );
      return result;
    } catch (error) {
      return { 
        status: 'error', 
        message: 'Payment service connection failed',
        error: error.code || error.message 
      };
    }
  }
  
  @Post('account')
  async createConnectAccount(
    @Body() createDto: { firebaseUid: string },
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.log(`Creating connect account for user: ${createDto.firebaseUid}`);
    
    return this.callPaymentService(
      'create_connect_account', 
      createDto, 
      'Create Connect Account'
    );
  }

  @Get('account/:hostId')
  async getConnectAccount(
    @Param('hostId') hostId: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new HttpException(
          'Authentication token is missing or invalid format',
          HttpStatus.UNAUTHORIZED
        );
      }

      this.logger.log(`Getting connect account for host: ${hostId}`);

      const result = await this.callPaymentService(
        'get_connect_account',
        { firebaseUid: hostId },
        'Get Connect Account'
      );

      this.logger.log(`Connect account service response:`, JSON.stringify({
        statusCode: result?.statusCode,
        message: result?.message,
        dataExists: !!result?.data
      }));

      return result;

    } catch (error) {
      this.logger.error(`Error in getConnectAccount: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to get connect account',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('account/:hostId/refresh')
  async refreshAccountLink(
    @Param('hostId') hostId: string,
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.log(`Refreshing account link for host: ${hostId}`);
    
    return this.callPaymentService(
      'refresh_account_link', 
      { firebaseUid: hostId }, 
      'Refresh Account Link'
    );
  }

  @Post('checkout-session')
  async createCheckoutSession(
    @Body() createCheckoutDto: any
  ) {
    this.logger.log(`Creating checkout session for booking: ${createCheckoutDto.bookingId}`);
    
    return this.callPaymentService(
      'create_checkout_session', 
      createCheckoutDto, 
      'Create Checkout Session'
    );
  }

  @Get('payment/:paymentId')
  async getPayment(
    @Param('paymentId') paymentId: string
  ) {
    this.logger.log(`Getting payment: ${paymentId}`);
    
    return this.callPaymentService(
      'get_payment', 
      { paymentId }, 
      'Get Payment'
    );
  }


  // Additional endpoints for API Gateway Connect Controller

  @Get('transactions/:hostId')
  async getHostTransactions(
    @Param('hostId') hostId: string,
    @Headers('authorization') authorization: string,
    @Query('timeframe') timeframe?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    try {
      if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new HttpException(
          'Authentication token is missing or invalid format',
          HttpStatus.UNAUTHORIZED
        );
      }

      this.logger.log(`Getting transactions for host: ${hostId}`);
      this.logger.log(`Query params - timeframe: ${timeframe}, status: ${status}, limit: ${limit}, offset: ${offset}`);

      const payload = {
        firebaseUid: hostId,
        timeframe: timeframe || 'thisMonth',
        status: status || 'all',
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      };

      this.logger.log(`Sending payload to payment service:`, JSON.stringify(payload));

      const result = await this.callPaymentService(
        'get_host_transactions',
        payload,
        'Get Host Transactions'
      );

      this.logger.log(`Payment service response:`, JSON.stringify({
        statusCode: result?.statusCode,
        message: result?.message,
        dataExists: !!result?.data
      }));

      return result;

    } catch (error) {
      this.logger.error(`Error in getHostTransactions: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to get host transactions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('payout/:hostId')
  async requestManualPayout(
    @Param('hostId') hostId: string,
    @Headers('authorization') authorization: string,
    @Body() payoutRequest?: { amount?: number }
  ) {
    try {
      if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new HttpException(
          'Authentication token is missing or invalid format',
          HttpStatus.UNAUTHORIZED
        );
      }

      this.logger.log(`Requesting manual payout for host: ${hostId}`);
      this.logger.log(`Payout request body:`, JSON.stringify(payoutRequest));

      const result = await this.callPaymentService(
        'request_manual_payout',
        {
          firebaseUid: hostId,
          amount: payoutRequest?.amount
        },
        'Request Manual Payout'
      );

      this.logger.log(`Manual payout service response:`, JSON.stringify({
        statusCode: result?.statusCode,
        message: result?.message,
        dataExists: !!result?.data
      }));

      return result;

    } catch (error) {
      this.logger.error(`Error in requestManualPayout: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to request manual payout',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  /*@Post('process-payment')
  async processBookingPayment(
    @Body() paymentDto: { 
      bookingId: string, 
      paymentMethodId: string,
      stripeCustomerId: string,
      guestId: string
    },
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.log(`Processing payment for booking: ${paymentDto.bookingId}`);
    
    try {
      // 1. Get booking details
      const bookingResult = await firstValueFrom(
        this.bookingClient.send('find_booking_by_id', paymentDto.bookingId)
      );

      if (bookingResult.statusCode !== 200) {
        throw new HttpException(
          bookingResult.message || 'Failed to fetch booking details',
          bookingResult.statusCode || HttpStatus.BAD_REQUEST
        );
      }

      const booking = bookingResult.data;

      // 2. Get host's plan information
      const planResult = await firstValueFrom(
        this.hostClient.send('get_plan_by_firebase_uid', { firebaseUid: booking.hostId })
      );

      if (!planResult) {
        throw new HttpException(
          'No plan found for this host',
          HttpStatus.NOT_FOUND
        );
      }

      // 3. Process payment with booking and plan data
      const bookingData = {
        bookingId: booking.id,
        hostId: booking.hostId,
        guestId: paymentDto.guestId,
        totalAmount: booking.totalAmount,
        currency: booking.currency || 'eur',
        paymentMethodId: paymentDto.paymentMethodId,
        stripeCustomerId: paymentDto.stripeCustomerId
      };

      const paymentResult = await firstValueFrom(
        this.paymentClient.send('process_booking_payment', {
          bookingData,
          hostPlanData: planResult
        })
      );

      if (paymentResult.statusCode !== 200) {
        throw new HttpException(
          paymentResult.message || 'Failed to process payment',
          paymentResult.statusCode || HttpStatus.BAD_REQUEST
        );
      }

      return paymentResult.data;
    } catch (error) {
      this.logger.error(`Failed to process payment: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to process payment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('payments/booking/:bookingId')
  async getPaymentsByBookingId(
    @Param('bookingId') bookingId: string,
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.log(`Getting payments for booking: ${bookingId}`);
    
    try {
      const result = await firstValueFrom(
        this.paymentClient.send('get_payments_by_booking', bookingId)
      );

      if (result.statusCode !== 200) {
        throw new HttpException(
          result.message || 'Failed to get payments',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }

      return result.data;
    } catch (error) {
      this.logger.error(`Failed to get payments: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to get payments',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('payouts/:hostId')
  async getHostPayouts(
    @Param('hostId') hostId: string,
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.log(`Getting payouts for host: ${hostId}`);
    
    try {
      const result = await firstValueFrom(
        this.paymentClient.send('get_host_payouts', hostId)
      );

      if (result.statusCode !== 200) {
        throw new HttpException(
          result.message || 'Failed to get host payouts',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }

      return result.data;
    } catch (error) {
      this.logger.error(`Failed to get host payouts: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to get host payouts',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }*/
}