// src/payment/dto/create-payment-method.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;

  @IsNotEmpty()
  @IsString()
  hostUid: string; // Changed from customerId to hostUid

  @IsOptional()
  @IsString()
  customerId?: string; // Keep for Stripe operations but make optional
}