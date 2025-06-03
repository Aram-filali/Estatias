import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Host } from './host.schema';
import { IsString, IsBoolean, IsEmail, IsOptional, ValidateIf, IsNumber, IsNotEmpty } from 'class-validator';

class Availability {
  @Prop({ required: true })
  start_time: string;

  @Prop({ required: true })
  end_time: string;

  @Prop({ required: true })
  price: number;
}

class ApartmentSpace {
  @Prop({ required: true })
  space_id: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  area: number;

  @Prop({ type: [String] })
  photos: string[];
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

/*class Safety {
  @Prop({ default: false }) BBQ_grill?: boolean;
  @Prop({ default: false }) Carbon_monoxide_alarm?: boolean;
  @Prop({ default: false }) Fire_extinguisher?: boolean;
  @Prop({ default: false }) First_aid_kit?: boolean;
  @Prop({ default: false }) Garden_or_backyard?: boolean;
  @Prop({ default: false }) Hangers?: boolean;
  @Prop({ default: false }) Lock_on_bedroom_door?: boolean;
  @Prop({ default: false }) Patio_or_balcony?: boolean;
  @Prop({ default: false }) Shampoo?: boolean;
  @Prop({ default: false }) Smoke_alarm?: boolean;
}*/

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
  title: string;

  @Prop({ required: true })
  place: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  @ValidateIf((o) => !o.isPrice)  
  price: number;


  @Prop({ required: true })
  @ValidateIf((o) => o.isPrice)  
  otherPlatformPrice: number;

  @Prop({ required: true }) 
  isPrice: boolean;

  @Prop({ type: [Availability] })
  availabilities: Availability[];

  @Prop({ required: true })
  type: string;

  @Prop({ type: [ApartmentSpace] })
  apartmentSpaces: ApartmentSpace[];

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  lotSize: number;

  @Prop({ required: true })
  rooms: number;

  @Prop({ required: true })
  bedrooms: number;

  @Prop({ required: true })
  bathrooms: number;

  @Prop({ required: true })
  beds_Number: number;

  @Prop({ required: true })
  touristTax: number;

  @Prop({ required: true })
  maxGuest: number;

  @Prop({ required: true })
  minNight: number;

  @Prop({ required: true })
  maxNight: number;

  @Prop({ type: Amenities })
  amenities: Amenities;

  /*@Prop({ type: Safety })  // Ajout du champ Safety
  safety: Safety;*/

  @Prop({ type: Policies })
  policies: Policies;

  @Prop({ type: [String], default: [] })  // Ajout de means_of_payment
  means_of_payment: string[];

  @Prop({ default: "" })
  phone?: string;

  @Prop({ default: "" })
  email?: string;

  @Prop({ default: "" })
  website?: string;

  @Prop({ type: String, required: true, ref: Host.name }) // Clé étrangère pour lier l'UID Firebase du Host
  hostId: string; 
}


export type PropertyDocument = Property & Document;
export const PropertySchema = SchemaFactory.createForClass(Property);
