// api-gateway/src/app.controller/payment.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Patch,
  Put,
  Delete,
  Param,
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

  // api-gateway/src/app.controller/payment.controller.ts
@Post('intent')
async createPaymentIntent(@Body() paymentIntentDto: any) {
  this.logger.log(`Creating payment intent: ${JSON.stringify(paymentIntentDto)}`);
  
  // Validate required fields
  if (!paymentIntentDto.amount) {
    throw new HttpException('Amount is required', HttpStatus.BAD_REQUEST);
  }
  
  if (!paymentIntentDto.paymentMethodId) {
    throw new HttpException('Payment method ID is required', HttpStatus.BAD_REQUEST);
  }
  
  if (!paymentIntentDto.hostUid) { // Changed from customerId to hostUid
    throw new HttpException('Host UID is required', HttpStatus.BAD_REQUEST);
  }
  
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

  // Updated API Gateway Payment Controller
@Post('methods')
async savePaymentMethod(@Body() createDto: any) {
  this.logger.log(`Saving payment method: ${JSON.stringify(createDto)}`);
  
  try {
    // Validate required fields
    if (!createDto.paymentMethodId) {
      throw new HttpException('Payment method ID is required', HttpStatus.BAD_REQUEST);
    }
    
    if (!createDto.hostUid) {
      throw new HttpException('Host UID is required', HttpStatus.BAD_REQUEST);
    }

    const result = await firstValueFrom(
      this.paymentClient.send('save_payment_method', createDto)
        .pipe(
          timeout(15000), // Increased timeout
          catchError(err => {
            this.logger.error(`RPC Error: ${JSON.stringify(err)}`);
            throw new HttpException(
              err.message || 'Payment service communication failed',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          })
        )
    );

    if (!result) {
      throw new HttpException(
        'Invalid response from payment service',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Check if the microservice returned an error
    if (result.statusCode !== HttpStatus.CREATED) {
      this.logger.error(`Payment service returned error: ${result.message}`);
      throw new HttpException(
        result.message || 'Failed to save payment method',
        result.statusCode || HttpStatus.BAD_REQUEST
      );
    }

    this.logger.log(`Payment method saved successfully`);
    return result.data;

  } catch (error) {
    this.logger.error(`Failed to save payment method: ${error.message}`, error.stack);
    
    // Handle specific error types
    if (error instanceof HttpException) {
      throw error;
    }
    
    throw new HttpException(
      error.message || 'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

@Get('methods')
async getPaymentMethods(@Query() query: any) {
  this.logger.log(`Fetching payment methods for hostUid: ${query.hostUid}`);
  
  try {
     console.log('Received hostUid:', query.hostUid); // Verify exact value
      console.log('Type of hostUid:', typeof query.hostUid); // Should be 'string'
      console.log('Length:', query.hostUid.length); // Verify not empty
     if (!query.hostUid) {
      throw new HttpException('Host UID is required', HttpStatus.BAD_REQUEST);
    }

    const result = await firstValueFrom(
      this.paymentClient.send('get_payment_methods', query)
        .pipe(
          timeout(10000),
          catchError(err => {
            this.logger.error(`RPC Error fetching payment methods: ${JSON.stringify(err)}`);
            throw new HttpException(
              err.message || 'Payment service communication failed',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          })
        )
    );

    if (!result) {
      throw new HttpException(
        'Invalid response from payment service',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    if (result.statusCode !== HttpStatus.OK) {
      this.logger.error(`Payment service returned error: ${result.message}`);
      throw new HttpException(
        result.message || 'Failed to fetch payment methods',
        result.statusCode || HttpStatus.BAD_REQUEST
      );
    }

    this.logger.log(`Successfully fetched ${result.data?.paymentMethods?.length || 0} payment methods`);
    return result.data;

  } catch (error) {
    this.logger.error(`Failed to fetch payment methods: ${error.message}`, error.stack);
    
    if (error instanceof HttpException) {
      throw error;
    }
    
    throw new HttpException(
      error.message || 'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}




// Add this new endpoint to your gateway PaymentController
@Patch('methods/default')
async setDefaultPaymentMethod(@Body() payload: { hostUid: string; paymentMethodId: string }) {
  this.logger.log(`Setting default payment method: ${JSON.stringify(payload)}`);
     
  try {
    if (!payload.hostUid) {
      throw new HttpException('Host UID is required', HttpStatus.BAD_REQUEST);
    }
    
    if (!payload.paymentMethodId) {
      throw new HttpException('Payment method ID is required', HttpStatus.BAD_REQUEST);
    }

    const result = await firstValueFrom(
      this.paymentClient.send('set_default_payment_method', payload)
        .pipe(
          timeout(10000),
          catchError(err => {
            this.logger.error(`RPC Error: ${JSON.stringify(err)}`);
            throw new HttpException(
              err.message || 'Payment service communication failed',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          })
        )
    );

    if (!result) {
      throw new HttpException(
        'Invalid response from payment service',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    if (result.statusCode !== HttpStatus.OK) {
      this.logger.error(`Payment service returned error: ${result.message}`);
      throw new HttpException(
        result.message || 'Failed to set default payment method',
        result.statusCode || HttpStatus.BAD_REQUEST
      );
    }

    this.logger.log('Default payment method updated successfully');
    return result.data;

  } catch (error) {
    this.logger.error(`Failed to set default payment method: ${error.message}`, error.stack);
         
    if (error instanceof HttpException) {
      throw error;
    }
         
    throw new HttpException(
      error.message || 'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

// Add this endpoint to your gateway PaymentController
@Delete('methods/:paymentMethodId')
async removePaymentMethod(
  @Param('paymentMethodId') paymentMethodId: string,
  @Body() payload: { hostUid: string }
) {
  this.logger.log(`Removing payment method: ${paymentMethodId} for hostUid: ${payload.hostUid}`);
  
  try {
    if (!payload.hostUid) {
      throw new HttpException('Host UID is required', HttpStatus.BAD_REQUEST);
    }
    
    if (!paymentMethodId) {
      throw new HttpException('Payment method ID is required', HttpStatus.BAD_REQUEST);
    }

    const result = await firstValueFrom(
      this.paymentClient.send('remove_payment_method', {
        hostUid: payload.hostUid,
        paymentMethodId
      })
        .pipe(
          timeout(10000),
          catchError(err => {
            this.logger.error(`RPC Error: ${JSON.stringify(err)}`);
            throw new HttpException(
              err.message || 'Payment service communication failed',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          })
        )
    );

    if (!result) {
      throw new HttpException(
        'Invalid response from payment service',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    if (result.statusCode !== HttpStatus.OK) {
      this.logger.error(`Payment service returned error: ${result.message}`);
      throw new HttpException(
        result.message || 'Failed to remove payment method',
        result.statusCode || HttpStatus.BAD_REQUEST
      );
    }

    this.logger.log('Payment method removed successfully');
    return result.data;
  } catch (error) {
    this.logger.error(`Failed to remove payment method: ${error.message}`, error.stack);
    
    if (error instanceof HttpException) {
      throw error;
    }
    
    throw new HttpException(
      error.message || 'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
}