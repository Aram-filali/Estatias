// schemas/booking-payment.schema.ts (updated)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BookingPaymentDocument = BookingPayment & Document;

@Schema({ timestamps: true })
export class BookingPayment {
  @Prop({ required: true })
  hostId: string;

  @Prop({ required: true })
  bookingId: string;

  @Prop({ required: true })
  guestId: string;

  @Prop({ required: true })
  amount: number; // in cents

  @Prop({ required: true, enum: ['Premium Plan', 'Standard Plan'] })
  plan: string;

  @Prop({ required: true, default: 'eur' })
  currency: string;

  @Prop({ required: true, enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'], default: 'pending' })
  status: string;

  @Prop()
  stripeSessionId?: string;

  @Prop()
  stripePaymentIntentId?: string;

  @Prop()
  platformFeeAmount?: number; // in cents

  @Prop()
  hostAmount?: number; // in cents (amount - platform fee)

  @Prop()
  stripeConnectAccountId?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  paidAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  failureReason?: string;
}

export const BookingPaymentSchema = SchemaFactory.createForClass(BookingPayment);