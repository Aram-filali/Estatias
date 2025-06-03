import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsBoolean, 
  ValidateIf, 
  IsNotEmpty, 
  IsNumber 
} from 'class-validator';


export class CreateHostDto {
  @IsString()
  @IsNotEmpty()
  firebaseUid: string;

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

  @IsBoolean()
  isAgency: boolean;

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

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isAgency)
  address: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsNumber()
  @IsNotEmpty()
  propertiesCount: number;

  @IsOptional()
  @IsString()
  kbisOrId?: String;

  @IsBoolean()
  hasRepresentative: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.hasRepresentative)  
  proxy?: string;  

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.hasRepresentative)  
  repId?: string; 
  
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  domainName?: string;
}