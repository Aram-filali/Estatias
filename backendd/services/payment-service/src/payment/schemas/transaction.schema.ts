import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = HostTransaction & Document;

@Schema({ timestamps: true })
export class HostTransaction {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop()
  paymentMethodId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true, enum: ['setup', 'maintenance', 'transaction'] })
  type: string;

  @Prop({ required: true, enum: ['pending', 'paid', 'failed'] })
  status: string;

  @Prop()
  stripePaymentIntentId: string;

  @Prop()
  invoiceUrl: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const TransactionSchema = SchemaFactory.createForClass(HostTransaction);