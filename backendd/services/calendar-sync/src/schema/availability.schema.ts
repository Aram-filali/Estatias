import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Property } from './property.schema';

export type AvailabilityDocument = Availability & Document;

@Schema({ timestamps: true })
export class Availability {
  /*@Prop({ type: Types.ObjectId, ref: 'Property', required: true, index: true })
  propertyId: Types.ObjectId;*/

  @Prop({  required: true })
  propertyId: string

  @Prop({ required: true })
  siteId: string

  @Prop({ type: Date, required: true, index: true })
  date: Date;

  @Prop({ required: true })
  isAvailable: boolean;

  @Prop({ required: true })
  source: string;

  @Prop({ type: Date, required: true })
  lastUpdated: Date;

  @Prop()
  price?: number;

  @Prop()
  currency?: string;

  @Prop()
  minimumStay?: number;

  // Timestamps automatiques de Mongoose
  createdAt?: Date;
  updatedAt?: Date;

  // Virtual pour la relation avec Property
  property?: Property;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// Ajout de la relation virtuelle
AvailabilitySchema.virtual('property', {
  ref: 'Property',
  localField: 'propertyId',
  foreignField: '_id',
  justOne: true,
});

// Index composé pour optimiser les requêtes
AvailabilitySchema.index({ propertyId: 1, date: 1 });