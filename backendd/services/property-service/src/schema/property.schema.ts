import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IsString, IsBoolean, IsEmail, IsOptional, ValidateIf, IsNumber, IsNotEmpty } from 'class-validator';

class Availability {
  @Prop({ required: true })
  start_time: string;

  @Prop({ required: true })
  end_time: string;


  @Prop({ required: true })
  @ValidateIf((o) => !o.isPrice)  
  price: number;


  @Prop({ required: true })
  @ValidateIf((o) => o.isPrice)  
  otherPlatformPrice: number;

  @Prop({ required: true }) 
  isPrice: boolean;

  @Prop({ required: true })
  touristTax: number;
}

class ApartmentSpace {
  @Prop({ required: true })
  space_id: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  area: number;

  @Prop({ type: [String], default: [] })
  photos: string[];
}

class MainPhotoData {
  @Prop({ required: true })
  index: number;

  @Prop({ default: '' })
  description: string;
}

class Amenities {
  @Prop({ default: false }) WiFi?: boolean;
  @Prop({ default: false }) Kitchen?: boolean;
  @Prop({ default: false }) Washer?: boolean;
  @Prop({ default: false }) Dryer?: boolean;
  @Prop({ default: false }) Free_parking?: boolean;
  @Prop({ default: false }) Air_conditioning?: boolean;
  @Prop({ default: false }) Heating?: boolean;
  @Prop({ default: false }) TV?: boolean;
  @Prop({ default: false }) Breakfast?: boolean;
  @Prop({ default: false }) Laptop_friendly_workspace?: boolean;
  @Prop({ default: false }) Crib?: boolean;
  @Prop({ default: false }) Hair_dryer?: boolean;
  @Prop({ default: false }) Iron?: boolean;
  @Prop({ default: false }) Essentials?: boolean;
  @Prop({ default: false }) Smoke_alarm?: boolean;
  @Prop({ default: false }) Carbon_monoxide_alarm?: boolean;
  @Prop({ default: false }) Fire_extinguisher?: boolean;
  @Prop({ default: false }) First_aid_kit?: boolean;
  @Prop({ default: false }) Lock_on_bedroom_door?: boolean;
  @Prop({ default: false }) Hangers?: boolean;
  @Prop({ default: false }) Shampoo?: boolean;
  @Prop({ default: false }) Garden_or_backyard?: boolean;
  @Prop({ default: false }) Patio_or_balcony?: boolean;
  @Prop({ default: false }) BBQ_grill?: boolean;
}

class Policies {
  @Prop({ default: false })
  smoking?: boolean;

  @Prop({ default: false })
  pets?: boolean;

  @Prop({ default: false })
  parties_or_events?: boolean;

  @Prop({ default: "" })
  check_in_start?: string;

  @Prop({ default: "" })
  check_in_end?: string;

  @Prop({ default: "" })
  check_out_start?: string;

  @Prop({ default: "" })
  check_out_end?: string;

  @Prop({ default: "" })
  quiet_hours_start?: string;

  @Prop({ default: "" })
  quiet_hours_end?: string;

  @Prop({ default: "" })
  cleaning_maintenance?: string;

  @Prop({ default: "" })
  cancellation_policy?: string;

  @Prop({ default: false })
  guests_allowed?: boolean;
}

@Schema({ collection: 'Properties', timestamps: true })
export class Property extends Document {

  @Prop({ required: true })
  firebaseUid: string;

  @Prop({ required: true })
  title: string;


  @Prop({ required: true })
  description: string;

  @Prop({ type: [Availability], default: [] })
  availabilities: Availability[];

  @Prop({ required: true })
  type: string;

  @Prop({ type: [ApartmentSpace], default: [] })
  apartmentSpaces: ApartmentSpace[];

  @Prop({ type: [String], default: [] })
  mainPhotos: string[];

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  city: string;

  // Make latitude and longitude optional
  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  @Prop({ required: true })
  size: number;

  // Required only for non-apartment properties
  @Prop({ required: function() { return this.type !== 'apartment'; } })
  lotSize: number;

  // For apartment properties only
  @Prop({ 
    type: Number, 
    default: 0,
    required: function() { return this.type === 'apartment'; } 
  })
  floorNumber: number;

  @Prop({ type: Number, default: 0 })
  numberOfBalconies: number;

  @Prop({ required: true })
  rooms: number;

  @Prop({ required: true })
  bedrooms: number;

  @Prop({ required: true })
  bathrooms: number;

  @Prop({ required: true })
  beds_Number: number;

  

  @Prop({ required: true })
  maxGuest: number;

  @Prop({ required: true })
  minNight: number;

  @Prop({ required: true })
  maxNight: number;

  @Prop({ type: Amenities, default: {} })
  amenities: Amenities;

  @Prop({ type: Policies, default: {} })
  policies: Policies;

  @Prop({ type: [String], default: [] })
  means_of_payment: string[];

  @Prop({ default: "" })
  phone?: string;

  @Prop({ default: "" })
  email?: string;

  @Prop({ default: "" })
  website?: string;

  @Prop({ type: String, default: "pending", enum: ["pending", "active", "approved", "rejected", "suspended"] })
  status: string;
}

export const PropertySchema = SchemaFactory.createForClass(Property);