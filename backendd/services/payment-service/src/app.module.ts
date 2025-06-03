// src/app.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../config/database.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [DatabaseModule, PaymentModule],
})
export class PayModule {}