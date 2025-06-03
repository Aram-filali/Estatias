import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CalendarSubscriptionDocument = CalendarSubscription & Document;

@Schema({ timestamps: true })
export class CalendarSubscription {
  @Prop({ required: true })
  propertyId: string;

  @Prop({ required: true })
  webhookUrl: string;

  @Prop({ type: [String], default: ['availability.updated'] })
  events: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt: Date;

  @Prop()
  lastTriggered?: Date;

  @Prop()
  failureCount?: number;

  @Prop()
  lastError?: string;
}

export const CalendarSubscriptionSchema = SchemaFactory.createForClass(CalendarSubscription);