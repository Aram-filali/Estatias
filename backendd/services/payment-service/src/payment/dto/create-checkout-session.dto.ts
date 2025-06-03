// dto/create-checkout-session.dto.ts
import { IsString, IsNumber, IsEnum, IsNotEmpty, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentPlan {
  STANDARD = 'Standard Plan',
  PREMIUM = 'Premium Plan',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  hostId: string;

  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount: number; // in cents

  @IsEnum(PaymentPlan)
  plan: PaymentPlan;

  @IsString()
  @IsNotEmpty()
  currency: 'eur' | 'usd' | 'gbp'; // default to EUR

  @IsString()
  @IsNotEmpty()
  guestId: string;
}