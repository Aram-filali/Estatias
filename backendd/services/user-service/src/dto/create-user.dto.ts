import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateUserDto {

  @IsString()
  @IsOptional() 
  fullname?: string;

  @IsEmail()
  @IsOptional() 
  email?: string; 

  @IsString()
  @IsOptional() 
  password?: string;

  @IsString()
  @IsOptional() 
  firebaseUid?: string;

  @IsString()
  @IsOptional() 
  role?: string;

  @IsOptional() 
  emailVerified: Boolean;

}