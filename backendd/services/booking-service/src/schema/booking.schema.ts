import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

class PricingDetails {
  @Prop({ required: true })
  total: number;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true })
  taxAmount: number;

  @Prop({ required: true })
  serviceCharge: number;
}

class GuestDetails {
  @Prop({ required: true })
  adults: number;

  @Prop({ default: 0 })
  children: number;

  @Prop({ default: 0 })
  infants: number;
}

class CustomerDetails {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: '' })
  message: string;

  @Prop({ default: '' })
  additionalMessage: string;
}

// New segment class matching availability structure
class BookingSegment {
  @Prop({ required: true })
  start_time: string;

  @Prop({ required: true })
  end_time: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  otherPlatformPrice: number;

  @Prop({ required: true }) 
  isPrice: boolean;

  @Prop({ required: true })
  touristTax: number;
}

@Schema({ collection: 'Bookings', timestamps: true })
export class Booking extends Document {
  @Prop({ required: true })
  propertyId: string;

  @Prop({ required: true })
  hostId: string;

  @Prop({ required: true })
  checkInDate: string;

  @Prop({ required: true })
  checkOutDate: string;

  @Prop({ required: true })
  nights: number;

  @Prop({ type: GuestDetails, required: true })
  guests: GuestDetails;

  // Add segments array with same structure as availability
  @Prop({ type: [BookingSegment], required: true })
  segments: BookingSegment[];

  @Prop({ type: PricingDetails, required: true })
  pricing: PricingDetails;

  @Prop({ type: CustomerDetails, required: true })
  customer: CustomerDetails;

  @Prop({ 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'approved', 'confirmed', 'rejected', 'canceled', 'completed'] 
  })
  status: string;

  @Prop({ default: null })
  paymentMethod: string;

   @Prop({ default: null })
  approvalDate: Date;

  @Prop({ default: null })
  confirmationDate: Date;

  @Prop({ default: null })
  rejectionDate: Date;

  @Prop({ default: null })
  cancellationDate: Date;

  @Prop({ default: null })
  cancellationReason: string;

  @Prop({ default: null })
  paymentExpirationDate: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);