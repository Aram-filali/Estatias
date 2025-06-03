import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateDocumentsDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasRepresentative?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isAgency?: boolean;

  @IsOptional()
  @IsString()
  kbisOrId?: string;

  @IsOptional()
  @IsString()
  proxy?: string;

  @IsOptional()
  @IsString()
  repId?: string;
}