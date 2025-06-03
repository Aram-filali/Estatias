// src/schema/sync-queue.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SyncPriority } from '../common/constants';

export type SyncQueueDocument = SyncQueue & Document;

@Schema({ timestamps: true })
export class SyncQueue {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true })
  propertyId: Types.ObjectId;

  @Prop({ 
    type: Number, 
    enum: Object.values(SyncPriority),
    default: SyncPriority.NORMAL 
  })
  priority: SyncPriority;

  @Prop({ 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending' 
  })
  status: string;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const SyncQueueSchema = SchemaFactory.createForClass(SyncQueue);