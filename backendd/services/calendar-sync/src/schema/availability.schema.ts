// src/schema/availability.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Interface pour un élément de disponibilité individuel
export interface AvailabilityItem {
  date: Date;
  isAvailable: boolean;
  price?: number;
  currency?: string;
  minStay?: number;
  notes?: string;
  metadata?: Record<string, any>;
  lastUpdated: Date;
}

// Schéma pour un élément de disponibilité
@Schema({ _id: false }) // Pas besoin d'_id pour les sous-documents
export class AvailabilityItemSchema implements AvailabilityItem {
  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ required: true })
  isAvailable: boolean;

  @Prop({ type: Number })
  price?: number;

  @Prop()
  currency?: string;

  @Prop({ type: Number })
  minStay?: number;

  @Prop()
  notes?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;
}

const AvailabilityItemSchemaFactory = SchemaFactory.createForClass(AvailabilityItemSchema);

@Schema({ timestamps: true })
export class Availability {
  @Prop({ required: true })
  propertyId: string;

  @Prop({ required: true })
  siteId: string;

  @Prop({ required: true })
  source: string; // 'ical', 'scraping', 'manual'

  // Tableau des disponibilités pour cette propriété et cette source
  @Prop({ 
    type: [AvailabilityItemSchemaFactory],
    default: [] 
  })
  availabilities: AvailabilityItem[];

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// Export the document type AFTER the schema definition
export type AvailabilityDocument = Availability & Document;

// Index pour optimiser les requêtes
AvailabilitySchema.index({ propertyId: 1, source: 1 }, { unique: true }); // Une seule entrée par propriété/source
AvailabilitySchema.index({ 'availabilities.date': 1 });
AvailabilitySchema.index({ propertyId: 1, 'availabilities.date': 1 });
AvailabilitySchema.index({ siteId: 1 });