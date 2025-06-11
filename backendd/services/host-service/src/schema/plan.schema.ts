import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HostPlanDocument = HostPlan & Document;

@Schema({ collection:'Plan',timestamps: true })
export class HostPlan {
  @Prop({ required: true, index: true })
  firebaseUid: string;

  @Prop({ required: true })
  plan: string;

  @Prop()
  websiteUrl: string;

  @Prop({ required: true })
  trialEndsAt: Date;

  @Prop({ required: true, default: true })
  isTrialActive: boolean;

  // New payment tracking fields
  @Prop({ required: false, default: false })
  isPaid: boolean;

  @Prop({ required: false })
  paymentStatus: string; // 'pending', 'paid', 'failed', 'refunded'

  @Prop({ required: false })
  paymentDate: Date;

  @Prop({ required: false })
  stripeCustomerId: string;

  @Prop({ required: false })
  lastPaymentIntentId: string;

  @Prop({ required: false })
  subscriptionStartDate: Date;
}

export const HostPlanSchema = SchemaFactory.createForClass(HostPlan);