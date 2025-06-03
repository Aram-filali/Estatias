import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IsString, IsBoolean, IsEmail, IsOptional, ValidateIf, IsNumber, IsNotEmpty } from 'class-validator';

export type HostDocument = Host & Document;

@Schema({ collection: 'Hosts', timestamps: true })
export class Host {
  
  @Prop({ required: true })
  firebaseUid: string;

  @Prop()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isAgency)  
  firstName?: string;

  @Prop()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isAgency) 
  lastName?: string;

  @Prop()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isAgency)  
  id?: string;

  @Prop({ required: true })
  @IsBoolean()
  isAgency: boolean;

  @Prop()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.isAgency)  
  businessName?: string;

  @Prop()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.isAgency)  
  businessId?: string;

  @Prop()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.isAgency)  
  headOffice?: string;

  @Prop({ required: true, unique: true })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  country: string;

  @Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @Prop()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => !o.isAgency)  
  address?: string;

  /*@Prop({ required: true })
  @IsString()
  @IsNotEmpty()
  password: string;*/

  @Prop({ required: true })
  @IsNumber()
  @IsNotEmpty()
  propertiesCount: number;

  @Prop()
  @IsOptional()
  @IsString()
  kbisOrId?: String; 

  @Prop({ required: true })
  @IsBoolean()
  hasRepresentative: boolean;

  @Prop()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.hasRepresentative)  
  proxy?: string;

  @Prop()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ValidateIf((o) => o.hasRepresentative) 
  repId?: string;

  @Prop()
  @IsString()
  @IsNotEmpty()
  role: string;

  
    @Prop()
    @IsString()
    @IsNotEmpty()
    status: string
  
    @Prop({ unique: true })
    @IsString()
    @IsNotEmpty()
    domainName: string
  
    @Prop()
    @IsNotEmpty()
    emailVerified: Boolean

  
}




export const HostSchema = SchemaFactory.createForClass(Host);
