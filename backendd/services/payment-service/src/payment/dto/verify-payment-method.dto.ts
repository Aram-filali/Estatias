// src/payment/dto/verify-payment-method.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class VerifyPaymentMethodDto {
  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}