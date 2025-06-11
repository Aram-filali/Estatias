// payment-serice/src/payment/payment.controller.ts
import { Controller, Post, Body, Get, Query, HttpStatus } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { VerifyPaymentMethodDto } from '../dto/verify-payment-method.dto';
import { PaymentIntentDto } from '../dto/payment-intent.dto';
import { CreatePaymentMethodDto } from '../dto/create-payment-method.dto';
import { PaymentMethodDto } from '../dto/payment-method.dto';
import { Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';


@Controller()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @MessagePattern('verify_payment_method')
  async verifyPaymentMethod(verifyDto: VerifyPaymentMethodDto) {
    try {
      const result = await this.paymentService.verifyPaymentMethod(verifyDto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Payment method verified successfully',
        data: result
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.reason || 'Verification failed',
        error: error.message
      };
    }
  }

  @MessagePattern('create_payment_intent')
  async createPaymentIntent(paymentIntentDto: PaymentIntentDto) {
    try {
      const result = await this.paymentService.createPaymentIntent(paymentIntentDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Payment intent created successfully',
        data: result
      };
    } catch (error) {
      return {
        statusCode: error.code ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.error || 'Payment failed',
        error: error.message
      };
    }
  }

 // Updated Payment Microservice Controller
@MessagePattern('save_payment_method')
async savePaymentMethod(createDto: CreatePaymentMethodDto) {
  this.logger.log(`Received save_payment_method request: ${JSON.stringify(createDto)}`);
  
  try {
    const result = await this.paymentService.savePaymentMethod(createDto);
    
    this.logger.log(`Payment method saved successfully for hostUid: ${createDto.hostUid}`);
    
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Payment method saved successfully',
      data: result
    };
  } catch (error) {
    this.logger.error(`Payment service error: ${error.error || error.message}`, error.stack);
    
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: error.error || error.message || 'Failed to save payment method',
      error: error.details || error
    };
  }
}

@MessagePattern('get_payment_methods')
async getPaymentMethods(paymentMethodDto: PaymentMethodDto) {
  this.logger.log(`Received get_payment_methods request for hostUid: ${paymentMethodDto.hostUid}`);
  
  try {
    const result = await this.paymentService.getPaymentMethods(paymentMethodDto.hostUid);
    
    this.logger.log(`Successfully retrieved ${result.paymentMethods?.length || 0} payment methods`);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Payment methods retrieved successfully',
      data: result
    };
  } catch (error) {
    this.logger.error(`Error retrieving payment methods: ${error.error || error.message}`, error.stack);
    
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: error.error || error.message || 'Failed to fetch payment methods',
      error: error.details || error
    };
  }
}


// Add this new method to your PaymentController
@MessagePattern('set_default_payment_method')
async setDefaultPaymentMethod(payload: { hostUid: string; paymentMethodId: string }) {
  this.logger.log(`Received set_default_payment_method request: ${JSON.stringify(payload)}`);
 
  try {
    const result = await this.paymentService.setDefaultPaymentMethod(
      payload.hostUid, 
      payload.paymentMethodId
    );
   
    this.logger.log(`Default payment method updated successfully for hostUid: ${payload.hostUid}`);
   
    return {
      statusCode: HttpStatus.OK,
      message: 'Default payment method updated successfully',
      data: result
    };
  } catch (error) {
    this.logger.error(`Error setting default payment method: ${error.error || error.message}`, error.stack);
   
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: error.error || error.message || 'Failed to set default payment method',
      error: error.details || error
    };
  }
}

// Add this method to your PaymentController
@MessagePattern('remove_payment_method')
async removePaymentMethod(payload: { hostUid: string; paymentMethodId: string }) {
  this.logger.log(`Received remove_payment_method request: ${JSON.stringify(payload)}`);

  try {
    const result = await this.paymentService.removePaymentMethod(
      payload.hostUid,
      payload.paymentMethodId
    );

    this.logger.log(`Payment method removed successfully for hostUid: ${payload.hostUid}`);

    return {
      statusCode: HttpStatus.OK,
      message: 'Payment method removed successfully',
      data: result
    };
  } catch (error) {
    this.logger.error(`Error removing payment method: ${error.error || error.message}`, error.stack);

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: error.error || error.message || 'Failed to remove payment method',
      error: error.details || error
    };
  }
}
}