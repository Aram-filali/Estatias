import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingService } from './app.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class PaymentExpirationTask {
  private readonly logger = new Logger(PaymentExpirationTask.name);

  constructor(private readonly bookingService: BookingService) {}

  // Run every hour to check for expired payments
  @Cron('0 * * * *')
  async handlePaymentExpirations() {
    this.logger.log('Running scheduled check for expired payment deadlines');
    await this.bookingService.checkExpiredPayments();
  }
}