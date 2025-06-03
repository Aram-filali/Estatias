import { IsString, IsNumber, IsNotEmpty, ValidateNested, IsOptional, IsEnum , IsIn, IsBoolean, IsArray} from 'class-validator';
import { Type } from 'class-transformer';

class PricingDetailsDto {
  @IsNumber()
  @IsNotEmpty()
  total: number;

  @IsNumber()
  @IsNotEmpty()
  subtotal: number;

  @IsNumber()
  @IsNotEmpty()
  taxAmount: number;

  @IsNumber()
  @IsNotEmpty()
  serviceCharge: number;
}

class GuestDetailsDto {
  @IsNumber()
  @IsNotEmpty()
  adults: number;

  @IsNumber()
  @IsOptional()
  children?: number;

  @IsNumber()
  @IsOptional()
  infants?: number;
}

class CustomerDetailsDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  additionalMessage?: string;
}

// New BookingSegmentDto class matching the schema
class BookingSegmentDto {
  @IsString()
  @IsNotEmpty()
  start_time: string;

  @IsString()
  @IsNotEmpty()
  end_time: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  otherPlatformPrice: number;

  @IsBoolean()
  @IsNotEmpty()
  isPrice: boolean;

  @IsNumber()
  @IsNotEmpty()
  touristTax: number;
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()  
  hostId: string;
  
  @IsString()
  @IsNotEmpty()
  checkInDate: string;

  @IsString()
  @IsNotEmpty()
  checkOutDate: string;

  @IsNumber()
  @IsNotEmpty()
  nights: number;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => GuestDetailsDto)
  guests: GuestDetailsDto;

  // Add segments validation
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BookingSegmentDto)
  segments: BookingSegmentDto[];

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PricingDetailsDto)
  pricing: PricingDetailsDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customer: CustomerDetailsDto;

  @IsString()
  @IsOptional()
  @IsEnum(['pending', 'approved', 'confirmed', 'rejected', 'canceled', 'completed'])
  status?: string;
}


export class UpdatePaymentMethodDto {
  @IsString()
  @IsNotEmpty({ message: 'Payment method is required' })
  @IsIn(['credit card', 'debit card', 'cash', 'check'], { 
    message: 'Payment method must be one of: credit card, debit card, cash, check' 
  })
  paymentMethod: string;
}