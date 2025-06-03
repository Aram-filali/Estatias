// src/payment/dto/create-payment-method.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;

  @IsOptional()
  @IsString()
  customerId?: string;
}