// src/schemas/review.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document & {
  _id: Types.ObjectId;
};

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Property' })
  propertyId: Types.ObjectId;

  @Prop({ required: true, type: String })
  userEmail: string;

  @Prop({ required: true, type: String })
  hostUid: string;

  @Prop({ required: true, type: String, maxlength: 1000 })
  comment: string;

  @Prop({ required: true, type: Number, min: 1, max: 5 })
  rating: number;

  @Prop({ default: Date.now })
  date: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);