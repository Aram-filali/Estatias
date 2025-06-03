// src/payment/dto/payment-method.dto.ts
import { IsString } from 'class-validator';

export class PaymentMethodDto {
  @IsString()
  customerId: string;
}