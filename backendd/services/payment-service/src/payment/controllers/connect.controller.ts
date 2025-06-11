// src/payment/controllers/connect.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ConnectService } from '../services/connect.service';
import { CreateCheckoutSessionDto, PaymentStatus } from '../dto/create-checkout-session.dto';

@Controller()
export class ConnectController {
  private readonly logger = new Logger(ConnectController.name);

  constructor(private readonly connectService: ConnectService) {}


  @MessagePattern('health_check')
  async healthCheck() {
    return {
      status: 'ok',
      service: 'payment-service',
      timestamp: new Date().toISOString()
    };
  }
  
  @MessagePattern('create_connect_account')
  async createConnectAccount(payload: { firebaseUid: string }) {
    this.logger.log(`Creating connect account for user: ${payload.firebaseUid}`);
    return this.connectService.createConnectAccount(payload.firebaseUid);
  }

  @MessagePattern('get_connect_account')
  async getConnectAccount(payload: { firebaseUid: string }) {
    try {
      this.logger.log(`Processing get_connect_account for user: ${payload.firebaseUid}`);
      
      const result = await this.connectService.getConnectAccount(payload.firebaseUid);
      
      this.logger.log(`Connect account service response status: ${result.statusCode}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error in getConnectAccount controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: 'Internal server error in getConnectAccount',
        data: null,
        error: error.message
      };
    }
  }

  @MessagePattern('refresh_account_link')
  async refreshAccountLink(payload: { firebaseUid: string }) {
    this.logger.log(`Refreshing account link for user: ${payload.firebaseUid}`);
    return this.connectService.refreshAccountLink(payload.firebaseUid);
  }
  
  @MessagePattern('create_checkout_session')
  async createCheckoutSession(payload: CreateCheckoutSessionDto) {
    this.logger.log(`Creating checkout session for booking: ${payload.bookingId}`);
    return this.connectService.createCheckoutSession(payload);
  }

  @MessagePattern('update_payment_status')
  async updatePaymentStatus(payload: { 
    paymentIntentId: string; 
    status: PaymentStatus; 
    metadata?: any 
  }) {
    this.logger.log(`Updating payment status for intent: ${payload.paymentIntentId}`);
    return this.connectService.updatePaymentStatus(
      payload.paymentIntentId, 
      payload.status, 
      payload.metadata
    );
  }

  @MessagePattern('get_payment')
  async getPayment(payload: { paymentId: string }) {
    this.logger.log(`Getting payment: ${payload.paymentId}`);
    return this.connectService.getPayment(payload.paymentId);
  }


  // Additional endpoints for Connect Controller in Payment Microservice

  @MessagePattern('get_host_transactions')
  async getHostTransactions(payload: {
    firebaseUid: string;
    timeframe?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      this.logger.log(`Processing get_host_transactions for user: ${payload.firebaseUid}`);
      this.logger.log(`Payload:`, JSON.stringify(payload));
      
      const result = await this.connectService.getHostTransactions(payload);
      
      this.logger.log(`Service response status: ${result.statusCode}`);
      this.logger.log(`Service response message: ${result.message}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error in getHostTransactions controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: 'Internal server error in getHostTransactions',
        data: null,
        error: error.message
      };
    }
  }

  @MessagePattern('request_manual_payout')
  async requestManualPayout(payload: {
    firebaseUid: string;
    amount?: number;
  }) {
    try {
      this.logger.log(`Processing request_manual_payout for user: ${payload.firebaseUid}`);
      this.logger.log(`Payout payload:`, JSON.stringify(payload));
      
      const result = await this.connectService.requestManualPayout(payload);
      
      this.logger.log(`Manual payout service response status: ${result.statusCode}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Error in requestManualPayout controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: 'Internal server error in requestManualPayout',
        data: null,
        error: error.message
      };
    }
  }

 /* @MessagePattern('process_booking_payment')
  async processBookingPayment(payload: { 
    bookingData: any,
    hostPlanData: any
  }) {
    this.logger.log(`Processing payment for booking: ${payload.bookingData.bookingId}`);
    return this.connectService.processBookingPayment(
      payload.bookingData, 
      payload.hostPlanData
    );
  }

  @MessagePattern('get_payments_by_booking')
  async getPaymentsByBookingId(bookingId: string) {
    this.logger.log(`Getting payments for booking: ${bookingId}`);
    return this.connectService.getPaymentsByBookingId(bookingId);
  }

  @MessagePattern('get_host_payouts')
  async getHostPayouts(hostId: string) {
    this.logger.log(`Getting payouts for host: ${hostId}`);
    return this.connectService.getHostPayouts(hostId);
  }*/
}