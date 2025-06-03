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

  
  @MessagePattern('save_payment_method')
  async savePaymentMethod(createDto: CreatePaymentMethodDto) {
    this.logger.log(`Received save_payment_method request: ${JSON.stringify(createDto)}`);
    
    try {
      const result = await this.paymentService.savePaymentMethod(createDto);
      
      this.logger.log(`Payment method saved successfully: ${JSON.stringify(result)}`);
      
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Payment method saved successfully',
        data: result
      };
    } catch (error) {
      this.logger.error(`Payment service error: ${JSON.stringify(error)}`);
      
      // Ensure we're properly structuring the error response
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.error || error.message || 'Failed to save payment method',
        error: error
      };
    }
  }

  @MessagePattern('get_payment_methods')
  async getPaymentMethods(paymentMethodDto: PaymentMethodDto) {
    try {
      const result = await this.paymentService.getPaymentMethods(paymentMethodDto.customerId);
      return {
        statusCode: HttpStatus.OK,
        message: 'Payment methods retrieved successfully',
        data: result
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.error || 'Failed to fetch payment methods',
        error: error.message
      };
    }
  }
}