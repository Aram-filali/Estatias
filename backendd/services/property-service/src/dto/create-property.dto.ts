import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, ValidateNested, IsObject, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

// Sous-DTO pour les disponibilités
class AvailabilityDto {
  @IsString()
  start_time: string;

  @IsString()
  end_time: string;

  @IsNumber()
  @ValidateIf((o) => !o.isPrice) 
  price: number;

  @IsBoolean()
  isPrice: boolean;
  
  @IsNumber()
  @ValidateIf((o) => o.isPrice) 
  otherPlatformPrice: number;

  @IsNumber()
  touristTax: number;

}

// Sous-DTO pour les espaces d'appartement
export class ApartmentSpaceDto {
  @IsString()
  space_id: string;

  @IsString()
  type: string;

  @IsNumber()
  area: number;

  @IsArray()
  @IsOptional()
  photos?: string[];
}

// Sous-DTO pour les métadonnées des photos principales
class MainPhotoDataDto {
  @IsNumber()
  index: number;

  @IsString()
  @IsOptional()
  description?: string;
}

// Sous-DTO pour les équipements
class AmenitiesDto {
  @IsBoolean()
  @IsOptional()
  WiFi?: boolean;

  @IsBoolean()
  @IsOptional()
  Kitchen?: boolean;

  @IsBoolean()
  @IsOptional()
  Washer?: boolean;

  @IsBoolean()
  @IsOptional()
  Dryer?: boolean;

  @IsBoolean()
  @IsOptional()
  Free_parking?: boolean;

  @IsBoolean()
  @IsOptional()
  Air_conditioning?: boolean;

  @IsBoolean()
  @IsOptional()
  Heating?: boolean;

  @IsBoolean()
  @IsOptional()
  TV?: boolean;

  @IsBoolean()
  @IsOptional()
  Breakfast?: boolean;

  @IsBoolean()
  @IsOptional()
  Laptop_friendly_workspace?: boolean;

  @IsBoolean()
  @IsOptional()
  Crib?: boolean;

  @IsBoolean()
  @IsOptional()
  Hair_dryer?: boolean;

  @IsBoolean()
  @IsOptional()
  Iron?: boolean;

  @IsBoolean()
  @IsOptional()
  Essentials?: boolean;

  @IsBoolean()
  @IsOptional()
  Smoke_alarm?: boolean;

  @IsBoolean()
  @IsOptional()
  Carbon_monoxide_alarm?: boolean;

  @IsBoolean()
  @IsOptional()
  Fire_extinguisher?: boolean;

  @IsBoolean()
  @IsOptional()
  First_aid_kit?: boolean;

  @IsBoolean()
  @IsOptional()
  Lock_on_bedroom_door?: boolean;

  @IsBoolean()
  @IsOptional()
  Hangers?: boolean;

  @IsBoolean()
  @IsOptional()
  Shampoo?: boolean;

  @IsBoolean()
  @IsOptional()
  Garden_or_backyard?: boolean;

  @IsBoolean()
  @IsOptional()
  Patio_or_balcony?: boolean;

  @IsBoolean()
  @IsOptional()
  BBQ_grill?: boolean;
}

// Sous-DTO pour les politiques
class PoliciesDto {
  @IsBoolean()
  @IsOptional()
  smoking?: boolean;

  @IsBoolean()
  @IsOptional()
  pets?: boolean;

  @IsBoolean()
  @IsOptional()
  parties_or_events?: boolean;

  @IsString()
  @IsOptional()
  check_in_start?: string;

  @IsString()
  @IsOptional()
  check_in_end?: string;

  @IsString()
  @IsOptional()
  check_out_start?: string;

  @IsString()
  @IsOptional()
  check_out_end?: string;

  @IsString()
  @IsOptional()
  quiet_hours_start?: string;

  @IsString()
  @IsOptional()
  quiet_hours_end?: string;

  @IsString()
  @IsOptional()
  cleaning_maintenance?: string;

  @IsString()
  @IsOptional()
  cancellation_policy?: string;

  @IsBoolean()
  @IsOptional()
  guests_allowed?: boolean;
}

export class CreatePropertyDto {
  @IsString()
  firebaseUid: string;

  @IsString()
  title: string;


  @IsString()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDto)
  @IsOptional()
  availabilities?: AvailabilityDto[];

  @IsString()
  type: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApartmentSpaceDto)
  @IsOptional()
  apartmentSpaces?: ApartmentSpaceDto[];

  @IsArray()
  @IsOptional()
  mainPhotos?: string[];
  
  // Pour stocker les chemins des photos d'espaces après le traitement des fichiers
  @IsArray()
  @IsOptional()
  apartmentSpacesPhotoPaths?: { spaceIndex: number, paths: string[] }[];

  @IsString()
  address: string;

  @IsString()
  country: string;

  @IsString()
  city: string;

  // Make latitude and longitude optional
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsNumber()
  size: number;

  // Required only for non-apartment properties
  @IsNumber()
  @ValidateIf(o => o.type !== 'apartment')
  @IsOptional()
  lotSize?: number;

  // Required only for apartment properties
  @IsNumber()
  @ValidateIf(o => o.type === 'apartment')
  @IsOptional()
  floorNumber?: number;

  @IsNumber()
  @IsOptional()
  numberOfBalconies?: number;

  @IsNumber()
  rooms: number;

  @IsNumber()
  bedrooms: number;

  @IsNumber()
  bathrooms: number;

  @IsNumber()
  beds_Number: number;

  
  @IsNumber()
  maxGuest: number;

  @IsNumber()
  minNight: number;

  @IsNumber()
  maxNight: number;

  @IsObject()
  @ValidateNested()
  @Type(() => AmenitiesDto)
  @IsOptional()
  amenities?: AmenitiesDto;

  @IsObject()
  @ValidateNested()
  @Type(() => PoliciesDto)
  @IsOptional()
  policies?: PoliciesDto;

  @IsArray()
  @IsOptional()
  means_of_payment?: string[];

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;
}