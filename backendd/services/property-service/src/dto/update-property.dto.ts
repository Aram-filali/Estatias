import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePropertyDto } from './create-property.dto';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApartmentSpaceDto as CreateApartmentSpaceDto } from './create-property.dto';

// DTO pour représenter une photo (soit un path pour les nouvelles, soit une URL pour les existantes)
export class PhotoDto {
  @IsString()
  @IsOptional()
  path?: string;  // Pour les nouveaux fichiers
  
  @IsString()
  @IsOptional()
  url?: string;  // Pour les URLs existantes
}

// DTO pour un espace d'appartement (à utiliser dans UpdatePropertyDto)
export class ApartmentSpaceDto {
  @IsString()
  space_id: string;  // Utilisé space_id pour correspondre à la structure MongoDB
  
  @IsString()
  @IsOptional()
  type?: string;
  
  @IsNumber()
  @IsOptional()
  area?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  photos?: (PhotoDto | string)[];  // Accepte à la fois des objets PhotoDto et des strings
}

// DTO pour les photos à supprimer dans un espace
export class DeletedSpacePhotoDto {
  @IsString()
  spaceId: string;

  @IsArray()
  @IsString({ each: true })
  photoUrls: string[];
}

export class UpdatePropertyDto extends OmitType(PartialType(CreatePropertyDto), ['apartmentSpacesPhotoPaths']) {
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  mainPhotos?: string[];
  
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  deletedMainPhotos?: string[];
  
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateApartmentSpaceDto) // Utilise le type importé
  apartmentSpaces?: CreateApartmentSpaceDto[];  

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DeletedSpacePhotoDto)
  deletedSpacePhotos?: DeletedSpacePhotoDto[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  deletedSpaces?: string[];
}