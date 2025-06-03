// api-gateway/src/app.controller/payment.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  HttpException, 
  HttpStatus, 
  Logger 
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom, timeout, catchError } from 'rxjs';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  @Post('verify')
  async verifyPaymentMethod(@Body() verifyDto: any) {
    this.logger.log(`Received payment verification request: ${JSON.stringify(verifyDto)}`);
    try {
      const result = await firstValueFrom(
        this.paymentClient.send('verify_payment_method', verifyDto)
      );

      if (result.statusCode !== 200) {
        throw new HttpException(
          result.message || 'Payment verification failed',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }

      return result.data;
    } catch (error) {
      this.logger.error(`Payment verification failed: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Payment verification failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('intent')
  async createPaymentIntent(@Body() paymentIntentDto: any) {
    this.logger.log(`Creating payment intent: ${JSON.stringify(paymentIntentDto)}`);
    try {
      const result = await firstValueFrom(
        this.paymentClient.send('create_payment_intent', paymentIntentDto)
      );

      if (result.statusCode !== 201) {
        throw new HttpException(
          result.message || 'Payment intent creation failed',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }

      return result.data;
    } catch (error) {
      this.logger.error(`Payment intent creation failed: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Payment intent creation failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

   @Post('methods')
  async savePaymentMethod(@Body() createDto: any) {
    this.logger.log(`Saving payment method: ${JSON.stringify(createDto)}`);
    try {
      const result = await firstValueFrom(
        this.paymentClient.send('save_payment_method', createDto)
          .pipe(
            timeout(10000), // Add a 10 second timeout
            catchError(err => {
              this.logger.error(`RPC Error: ${JSON.stringify(err)}`);
              throw new HttpException(
                err.message || 'Payment service communication failed',
                HttpStatus.INTERNAL_SERVER_ERROR
              );
            })
          )
      );

      // Check if the result is properly structured
      if (!result) {
        throw new HttpException(
          'Invalid response from payment service',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      if (result.statusCode !== HttpStatus.CREATED) {
        throw new HttpException(
          result.message || 'Failed to save payment method',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }

      return result.data;
    } catch (error) {
      this.logger.error(`Failed to save payment method: ${error.message}`, error.stack);
      
      // Ensure we're always sending a proper error response
      throw new HttpException(
        error.message || 'Failed to save payment method',
        error.status || error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('methods')
  async getPaymentMethods(@Query() query: any) {
    this.logger.log(`Fetching payment methods for customer: ${query.customerId}`);
    try {
      const result = await firstValueFrom(
        this.paymentClient.send('get_payment_methods', query)
      );

      if (result.statusCode !== 200) {
        throw new HttpException(
          result.message || 'Failed to fetch payment methods',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }

      return result.data;
    } catch (error) {
      this.logger.error(`Failed to fetch payment methods: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to fetch payment methods',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}