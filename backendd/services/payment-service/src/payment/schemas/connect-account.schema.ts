// src/payment/schemas/connect-account.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConnectAccountDocument = ConnectAccount & Document;

@Schema({ timestamps: true })
export class ConnectAccount {
  @Prop({ required: true, unique: true })
  firebaseUid: string;
  
  @Prop({ required: true })
  stripeConnectAccountId: string;
  
  @Prop({ default: false })
  detailsSubmitted: boolean;
  
  @Prop({ default: false })
  payoutsEnabled: boolean;
  
  @Prop()
  accountLink: string;
  
  @Prop({ type: Object })
  bankAccount: {
    last4: string;
    country: string;
    currency: string;
    status: string;
  };
  
  @Prop()
  createdAt: Date;
  
  @Prop()
  updatedAt: Date;
}

export const ConnectAccountSchema = SchemaFactory.createForClass(ConnectAccount);