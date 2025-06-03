import { IsNotEmpty, IsNumber, IsBoolean, IsString, IsDateString } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsNotEmpty()
  @IsNumber()
  propertyId: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsBoolean()
  isAvailable: boolean;

  @IsNotEmpty()
  @IsString()
  source: string;
}