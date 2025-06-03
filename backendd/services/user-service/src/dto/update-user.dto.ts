import { IsString, IsOptional, MinLength, IsUUID } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsUUID('4', { message: 'Invalid Firebase UID format' })
  firebaseUid: string;
  
  @IsString()
  @IsOptional()
  fullname?: string;
  
  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword?: string;
  
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @IsOptional()
  updatedAt?: Date

  @IsOptional() 
  emailVerified: Boolean;
}