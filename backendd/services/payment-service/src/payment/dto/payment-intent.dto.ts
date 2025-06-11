// src/payment/dto/payment-intent.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PaymentIntentDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;

  @IsNotEmpty()
  @IsString()
  hostUid: string;
}