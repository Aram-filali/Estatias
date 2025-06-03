import { IsString, IsBoolean, IsEmail, IsOptional, ValidateIf, IsArray, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { CreateHostDto } from '../../dto/create-host.dto';

class NotificationDto {
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsNotEmpty()
  isRead: boolean;

  @IsString()
  @IsOptional()
  actionUrl?: string;
}

export class UpdateProfileDto extends PartialType(CreateHostDto) {
  @IsString()
  @IsNotEmpty()
  firebaseUid: string;

  @IsOptional()
  @IsString()
  businessname?: string;

  @IsOptional()
  @IsString()
  headoffice?: string;

  @IsOptional()
  @IsString()
  firstname?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsString()
  domainName?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  websiteUrl?: string;

  @IsArray()
  @IsOptional()
  @Type(() => NotificationDto)
  notifications?: NotificationDto[];

  @IsBoolean()
  @IsOptional()
  isAgency?: boolean;
}