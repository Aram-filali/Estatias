// First, let's define a proper image interface to handle different image formats
interface ImageData {
  url?: string;
  src?: string;
  path?: string;
  // Add other potential properties that might be in your image objects
}

interface Availability {
  start_time: string;
  end_time: string;
  price: number;
  touristTax: number;
}

interface ApartmentSpace {
  space_id: string;
  type: string;
  area: number;
  photos: string[];
}

interface Amenities {
  WiFi?: boolean;
  Kitchen?: boolean;
  Washer?: boolean;
  Dryer?: boolean;
  Free_parking?: boolean;
  Air_conditioning?: boolean;
  Heating?: boolean;
  TV?: boolean;
  Breakfast?: boolean;
  Laptop_friendly_workspace?: boolean;
  Crib?: boolean;
  Hair_dryer?: boolean;
  Iron?: boolean;
  Essentials?: boolean;
  Smoke_alarm?: boolean;
  Carbon_monoxide_alarm?: boolean;
  Fire_extinguisher?: boolean;
  First_aid_kit?: boolean;
  Lock_on_bedroom_door?: boolean;
  Hangers?: boolean;
  Shampoo?: boolean;
  Garden_or_backyard?: boolean;
  Patio_or_balcony?: boolean;
  BBQ_grill?: boolean;
}

interface Policies {
  smoking?: boolean;
  pets?: boolean;
  parties_or_events?: boolean;
  check_in_start?: string;
  check_in_end?: string;
  check_out_start?: string;
  check_out_end?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  cleaning_maintenance?: string;
  cancellation_policy?: string;
  guests_allowed?: boolean;
}

export interface Property {
  _id?: string;
  id: string;
  title: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  place: string;
  type: string;
  address: string;
  country: string;
  state: string;
  city: string;
  latitude: number;
  longitude: number;
  size: number;
  lotSize: number;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  touristTax: number;
  maxGuest: number;
  minNight: number;
  maxNight: number;
  beds_Number: number;
  price: number;
  status: 'available' | 'unavailable' | string;
  amenities: Amenities;
  policies: Policies;
  means_of_payment: string[];
  paymentMethods: {
    'credit card': boolean;
    'debit card': boolean;
    'paypal': boolean;
    'cash': boolean;
    'check': boolean;
    'bank transfer': boolean;
  };
  mainPhotos?: (File | string | ImageData)[]; // Updated to include ImageData objects
  createdAt?: string;
}

export interface HostData {
  firstName: string;
  lastName: string;
  address: string;
  id: string;
  businessName?: string;
  businessId?: string;
  headOffice?: string;
  email: string;
  country: string;
  phoneNumber: string;
  propertiesCount: string;
  isAgency: boolean;
  kbisOrId: File | null | string;
  hasRepresentative: boolean;
  proxy: File | null | string;
  repId: File | null | string;
  properties?: Property[];
}