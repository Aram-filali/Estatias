// src/payment/schemas/payment-method.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentMethodDocument = PaymentMethod & Document;

@Schema({ timestamps: true })
export class PaymentMethod {
  @Prop({ required: true })
  stripePaymentMethodId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  type: string; // 'card', 'paypal', etc.

  @Prop({ type: Object })
  details: {
    brand?: string;
    lastFour?: string;
    expiryMonth?: number;
    expiryYear?: number;
    email?: string;
  };

  @Prop({ default: false })
  isDefault: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);