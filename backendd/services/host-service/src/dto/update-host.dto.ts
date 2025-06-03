import { IsString, IsBoolean, IsEmail, IsOptional, ValidateIf, IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateHostDto } from './create-host.dto';

export class UpdateHostDto extends PartialType(CreateHostDto) {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isAgency)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isAgency)
  lastName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isAgency)
  id?: string;

  @IsOptional()
  @IsBoolean()
  isAgency?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.isAgency)
  businessName?: string;

  

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.isAgency)
  businessId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.isAgency)
  headOffice?: string;

  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  country?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isAgency)
  address?: string;

  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  propertiesCount?: number;
}