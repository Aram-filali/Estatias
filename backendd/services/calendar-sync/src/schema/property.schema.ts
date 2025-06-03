import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Availability } from './availability.schema';
import { SyncLog } from './sync-log.schema';

// Option 1: Extend the PropertyDocument type to explicitly include _id
export type PropertyDocument = Property & Document & {
  _id: Types.ObjectId;
};

// Option 2: Alternative - you can also use HydratedDocument from mongoose
// import { HydratedDocument } from 'mongoose';
// export type PropertyDocument = HydratedDocument<Property>;

@Schema({ timestamps: true })
export class Property {
  @Prop({ required: true })
  siteId: string;

  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  publicUrl: string;

  @Prop()
  name?: string;

  @Prop()
  location?: string;

  @Prop()
  ownerId?: string;

  @Prop({ default: false })
  active: boolean;

  @Prop({ type: Date })
  lastSynced?: Date;

  @Prop()
  syncFrequency?: number;

  // Timestamps automatiques de Mongoose
  createdAt?: Date;
  updatedAt?: Date;

  // Relations virtuelles
  availabilities?: Availability[];
  syncLogs?: SyncLog[];
}

export const PropertySchema = SchemaFactory.createForClass(Property);

// Relations virtuelles
PropertySchema.virtual('availabilities', {
  ref: 'Availability',
  localField: '_id',
  foreignField: 'propertyId',
});

PropertySchema.virtual('syncLogs', {
  ref: 'SyncLog',
  localField: '_id',
  foreignField: 'propertyId',
});

// Pour inclure les virtuals lors de la sérialisation JSON
PropertySchema.set('toJSON', { virtuals: true });
PropertySchema.set('toObject', { virtuals: true });