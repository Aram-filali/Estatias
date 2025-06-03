// api-gateway/src/app.controller/connect.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
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

  

  private async callPaymentService(pattern: string, payload: any, operation: string) {
    try {
      const result = await firstValueFrom(
        this.paymentClient.send(pattern, payload).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`${operation} - Payment service error:`, {
              code: error.code,
              message: error.message,
              pattern,
              payload
            });
            
            if (error.code === 'ECONNREFUSED') {
              throw new HttpException(
                'Payment service is currently unavailable. Please try again later.',
                HttpStatus.SERVICE_UNAVAILABLE
              );
            }
            
            throw error;
          })
        )
      );

      // Handle microservice response format
      if (result && typeof result === 'object') {
        // Check if result has error status from microservice
        if (result.status === 'error') {
          this.logger.error(`${operation} - Microservice returned error:`, result);
          throw new HttpException(
            result.message || `${operation} failed`,
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
        
        // Check if result has statusCode (custom microservice response format)
        if (result.statusCode && result.statusCode !== 200 && result.statusCode !== 201) {
          throw new HttpException(
            result.message || `${operation} failed`,
            result.statusCode
          );
        }
        
        return result.data || result;
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`${operation} failed:`, error);
      throw new HttpException(
        error.message || `${operation} failed`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
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
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.log(`Getting connect account for host: ${hostId}`);
    
    return this.callPaymentService(
      'get_connect_account', 
      { firebaseUid: hostId }, 
      'Get Connect Account'
    );
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