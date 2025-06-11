import { IsString, IsBoolean, IsOptional, IsUrl } from 'class-validator';

export class UpdateDocumentsDto {
  @IsOptional()
  @IsBoolean()
  hasRepresentative?: boolean;

  @IsOptional()
  @IsBoolean()
  isAgency?: boolean;

  @IsOptional()
  @IsString()
  firebaseUid?: string;

  @IsOptional()
  @IsUrl()
  @IsString()
  kbisOrId?: string;

  @IsOptional()
  @IsUrl()
  @IsString()
  proxy?: string;

  @IsOptional()
  @IsUrl()
  @IsString()
  repId?: string;
}