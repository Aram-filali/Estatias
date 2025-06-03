// src/common/interfaces/calendar-data.interface.ts
import { Property } from '../../schema/property.schema';
import { Availability } from '../../schema/availability.schema';

export interface CalendarData {
  property: Property;
  availabilities: Availability[];
}

export interface AvailabilityItem {
  date: string;
  available: boolean;
  isAvailable?: boolean; // For compatibility with scraper
  price?: number;
  minStay?: number;
  maxStay?: number;
  checkinAllowed?: boolean;
  checkoutAllowed?: boolean;
}

export interface AvailabilityData {
  date: string;
  isAvailable: boolean;
}

export interface PropertyAvailabilityResult {
  success: boolean;
  availabilities?: AvailabilityItem[];
  error?: string;
}