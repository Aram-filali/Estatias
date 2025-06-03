import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Property } from './property.schema';

export type SyncStatus = 'PENDING' | 'STARTED' | 'SUCCESS' | 'ERROR' | 'CRITICAL_ERROR' | 'CANCELLED';

export type SyncLogDocument = SyncLog & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class SyncLog {
  @Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  propertyId: Types.ObjectId;

  @Prop({ required: true })
  platform: string;

  @Prop({
    type: String,
    enum: ['PENDING', 'STARTED', 'SUCCESS', 'ERROR', 'CRITICAL_ERROR', 'CANCELLED'],
    default: 'PENDING'
  })
  status: SyncStatus;

  @Prop()
  message?: string;

  @Prop()
  availabilitiesUpdated?: number;

  @Prop()
  captchaEncountered?: boolean;

  @Prop()
  executionTimeMs?: number;

  @Prop({ type: Date })
  completedAt?: Date;

  // Timestamp automatique de Mongoose (seulement createdAt)
  createdAt?: Date;
  updatedAt?: Date;

  // Virtual pour la relation avec Property
  property?: Property;
}

export const SyncLogSchema = SchemaFactory.createForClass(SyncLog);

// Relation virtuelle
SyncLogSchema.virtual('property', {
  ref: 'Property',
  localField: 'propertyId',
  foreignField: '_id',
  justOne: true,
});

// Index pour optimiser les requêtes par propriété et date
SyncLogSchema.index({ propertyId: 1, createdAt: -1 });