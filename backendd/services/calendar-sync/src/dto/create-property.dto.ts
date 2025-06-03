import { IsString, IsNotEmpty, IsUrl, IsEnum, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export enum PlatformType {
  AIRBNB = 'airbnb',
  BOOKING = 'booking',
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl({}, { message: 'URL publique invalide' })
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  publicUrl: string;

  @IsEnum(PlatformType, { message: 'Plateforme doit être "airbnb" ou "booking"' })
  platform: PlatformType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  syncFrequency?: number = 3; // 1 = prioritaire, 5 = moins fréquent

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;

  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Le siteId sera auto-généré depuis l'URL publique
  siteId?: string;
}