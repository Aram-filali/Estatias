import { Injectable, NotFoundException, BadRequestException, HttpException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from './schema/property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import type { Document as MongooseDocument } from 'mongoose';
import { ApartmentSpaceDto } from './dto/update-property.dto';
import * as mongoose from 'mongoose';


@Injectable()
export class PropertyService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    @Inject('HOST_SERVICE') private hostClient: ClientProxy,
  ) {}
  
  /* Validates property type specific fields */
  private validatePropertyTypeFields(dto: CreatePropertyDto): void {
    if (dto.type === 'apartment') {
      if (dto.floorNumber === undefined || dto.floorNumber === null) {
        throw new BadRequestException('Floor number is required for apartment properties');
      }
    } 
    else {
      if (dto.lotSize === undefined || dto.lotSize === null) {
        throw new BadRequestException('Lot size is required for non-apartment properties');
      }
    }
  }

  /* Helper to clean up photos if property creation fails*/
  private cleanupPhotos(mainPhotos?: string[], apartmentSpacesPhotoPaths?: { spaceIndex: number; paths: string[] }[]): void {
    try {
      // Clean up main photos
      if (mainPhotos?.length) {
        mainPhotos.forEach(photoPath => {
          if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
          }
        });
      }

      // Clean up apartment space photos
      if (apartmentSpacesPhotoPaths?.length) {
        apartmentSpacesPhotoPaths.forEach(space => {
          space.paths.forEach(photoPath => {
            if (fs.existsSync(photoPath)) {
              fs.unlinkSync(photoPath);
            }
          });
        });
      }
    } catch (error) {
      console.error('Error cleaning up photos:', error);
    }
  }

  // La méthode cleanupPhotos n'est plus nécessaire car Firebase Storage gère les fichiers

  async createProperty(dto: CreatePropertyDto): Promise<Property> {
    try {
      console.log('Creating property with data:', JSON.stringify(dto, null, 2));

      this.validatePropertyTypeFields(dto);

      // Les URLs Firebase sont déjà dans dto.mainPhotos
      const mainPhotos = dto.mainPhotos || [];

      // Préparer les espaces d'appartement avec les URLs Firebase
      const apartmentSpaces = (dto.apartmentSpaces || []).map(space => ({
        space_id: space.space_id || `space-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: space.type || '',
        area: space.area || 0,
        photos: space.photos || [], // URLs Firebase déjà présentes
      }));

      const newProperty = new this.propertyModel({
        firebaseUid: dto.firebaseUid, 
        title: dto.title,
        description: dto.description,
        availabilities: dto.availabilities || [],
        type: dto.type,
        apartmentSpaces,
        mainPhotos,
        address: dto.address,
        country: dto.country,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        size: dto.size,
        lotSize: dto.type !== 'apartment' ? dto.lotSize : undefined,
        floorNumber: dto.type === 'apartment' ? dto.floorNumber : undefined,
        numberOfBalconies: dto.numberOfBalconies || 0,
        rooms: dto.rooms,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        beds_Number: dto.beds_Number,
        maxGuest: dto.maxGuest,
        minNight: dto.minNight,
        maxNight: dto.maxNight,
        amenities: dto.amenities || {},
        policies: dto.policies || {},
        means_of_payment: dto.means_of_payment || [],
        phone: dto.phone || '',
        email: dto.email || '',
        website: dto.website || '',
        status: 'pending',
      });

      try {
        const savedProperty = await newProperty.save();
        console.log('Property created successfully:', savedProperty._id);
        return savedProperty.toObject();
      } catch (validationError) {
        console.error('MongoDB validation error:', validationError);
        if (validationError.name === 'ValidationError') {
          const fieldErrors = Object.keys(validationError.errors).map(field =>
            `${field}: ${validationError.errors[field].message}`
          );
          throw new BadRequestException(`Validation failed: ${fieldErrors.join(', ')}`);
        }
        throw validationError;
      }
    } catch (error) {
      // Pas besoin de nettoyer les fichiers, car ils sont gérés par Firebase
      if (error.status) {
        throw error;
      } else {
        console.error('Error in createProperty:', error);
        throw new BadRequestException(error.message || 'Failed to create property');
      }
    }
  }

  /**
   * Find all properties
   */
  async findAll(): Promise<Property[]> {
    try {
      console.log('Fetching all properties from database');
      return await this.propertyModel.find().exec();
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw new BadRequestException('Failed to fetch properties');
    }
  }

  /**
   * Find properties by the user's firebase ID
   */
  async findByFirebaseUid(firebaseUid: string): Promise<Property[]> {
    try {
      console.log(`Finding properties for host with firebaseUid: ${firebaseUid}`);
      const properties = await this.propertyModel.find({ firebaseUid }).exec();
      console.log(`Found ${properties.length} properties for firebaseUid: ${firebaseUid}`);
      return properties;
    } catch (error) {
      console.error(`Error finding properties for firebaseUid ${firebaseUid}:`, error);
      throw new BadRequestException(`Failed to fetch properties for user: ${error.message}`);
    }
  }
  async findById(id: string): Promise<Property> {
    console.group('🔍 Database Property Lookup');
    console.log('🆔 Lookup ID:', id);
    console.log('🧩 ID Validity:', mongoose.Types.ObjectId.isValid(id));
    console.groupEnd();
  
    const property = await this.propertyModel.findById(id)
      .lean()
      .select('-__v -createdAt -updatedAt')
      .exec();

      if (property) {
        property.id = property._id.toString();
      }
  
    if (!property) {
      console.warn(`❌ No property found with ID: ${id}`);
      throw new NotFoundException(`Property with ID ${id} not found`);
    }
  
    console.group('✅ Property Found');
    console.log('🆔 Confirmed Property ID:', property._id.toString());
    console.log('👤 Associated Firebase UID:', property.firebaseUid);
    console.groupEnd();
  
    return property;
  }

/**
   * Get property photos by the user's firebase ID
   */
async getPropertyPhotosByFirebaseUid(firebaseUid: string): Promise<{ propertyId: string, title: string, mainPhotos: string[] }[]> {
  try {
    console.log(`Finding property photos for user with firebaseUid: ${firebaseUid}`);
    
    // Find all properties matching the firebaseUid and select only the fields we need
    const properties = await this.propertyModel.find({ firebaseUid })
      .select('_id title mainPhotos')
      .lean()
      .exec();
    
    // Format the response to include only necessary data
    const photosData = properties.map(property => ({
      propertyId: property._id.toString(),
      title: property.title || 'Untitled Property',
      mainPhotos: property.mainPhotos || []
    }));
    
    console.log(`Found photos for ${photosData.length} properties for firebaseUid: ${firebaseUid}`);
    
    return photosData;
  } catch (error) {
    console.error(`Error finding property photos for firebaseUid ${firebaseUid}:`, error);
    throw new Error(`Failed to fetch property photos for user: ${error.message}`);
  }
}


  /**
   * Remove a property by its ID
   * @param id The ID of the property to remove
   * @param firebaseUid Optional firebase UID to check property ownership
   */
  async remove(id: string, firebaseUid?: string): Promise<{ deleted: boolean }> {
    try {
      // Find the property first to ensure it exists and check ownership if firebaseUid is provided
      const property = await this.findById(id);
      
      if (firebaseUid && property.firebaseUid !== firebaseUid) {
        throw new BadRequestException('Cannot delete property: user ID mismatch');
      }

      // Capture photo paths before deleting for cleanup
      const mainPhotos = property.mainPhotos || [];
      const apartmentSpacesPhotoPaths = property.apartmentSpaces?.map((space, spaceIndex) => ({
        spaceIndex,
        paths: space.photos || []
      })) || [];

      // Delete the property
      const result = await this.propertyModel.deleteOne({ _id: id }).exec();
      
      if (result.deletedCount === 0) {
        throw new NotFoundException(`Property with ID ${id} not found`);
      }

      // Clean up photos after successful deletion
      this.cleanupPhotos(mainPhotos, apartmentSpacesPhotoPaths);

      return { deleted: true };
    } catch (error) {
      if (error.status) {
        throw error;
      } else {
        throw new BadRequestException(error.message || 'Failed to delete property');
      }
    }
  }

  /**
   * Search properties based on filters
   */
  async searchProperties(filters: any): Promise<Property[]> {
    const query: any = {};

    // If firebaseUid is provided, search only within user's properties
    if (filters.firebaseUid) {
      query.firebaseUid = filters.firebaseUid;
    }

    // Location filters
    if (filters.country) query.country = filters.country;
    if (filters.city) query.city = filters.city;

    // Property type filter
    if (filters.type) query.type = filters.type;

    // Amenities filters
    if (filters.amenities) {
      for (const [key, value] of Object.entries(filters.amenities)) {
        if (value === true) {
          query[`amenities.${key}`] = true;
        }
      }
    }

    // Capacity filter
    if (filters.maxGuest) {
      query.maxGuest = { $gte: parseInt(filters.maxGuest) };
    }

    return this.propertyModel.find(query).exec();
  }

          // Vérifier la propriété si firebaseUid est fourni
      /*if (dto.firebaseUid) {
        const existing = await this.findById(id);
        if (existing.firebaseUid !== dto.firebaseUid) {
          throw new UnauthorizedException('You can only update your own properties');
        }
      }*/

  
        async updateProperty(id: string, dto: UpdatePropertyDto): Promise<Property> {
          try {
              // Add ID validation at the start
              if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new BadRequestException('Invalid property ID');
              }
            const existingProperty = await this.propertyModel.findById(id).exec();
            if (!existingProperty) {
              throw new NotFoundException(`Property ${id} not found`);
            }
        
            if (dto.firebaseUid && existingProperty.firebaseUid !== dto.firebaseUid) {
              throw new UnauthorizedException('You can only update your own properties');
            }
        
            // Définir explicitement le type pour les photos
            type SpacePhoto = string | { url: string };
        
            const processedSpaces = (dto.apartmentSpaces || []).map(space => {
              return {
                space_id: space.space_id || `space_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
                type: space.type || '',
                area: space.area || 0,
                photos: (space.photos || []).map((photo: SpacePhoto) => 
                  typeof photo === 'string' ? photo : photo.url
                ).filter((url: string) => !!url)
              };
            });
        
            const updateData = {
              ...dto,
              mainPhotos: dto.mainPhotos || [],
              apartmentSpaces: processedSpaces
            };
        
            // Clean up temporary fields
            delete updateData.deletedMainPhotos;
            delete updateData.deletedSpacePhotos;
            delete updateData.deletedSpaces;
        
            const updatedProperty = await this.propertyModel.findByIdAndUpdate(
              id,
              { $set: updateData },
              { new: true, runValidators: true }
            ).exec();
        
            if (!updatedProperty) {
              throw new NotFoundException(`Property ${id} update failed`);
            }
        
            return updatedProperty.toObject();
          } catch (error) {
            console.error('Update error:', error);
            if (error instanceof HttpException) throw error;
            throw new BadRequestException(`Update failed: ${error.message}`);
          }
        }


        // Add this method to PropertyService class

      async updatePropertyAvailabilityForBooking(bookingData: {
        propertyId: string;
        checkInDate: string;
        checkOutDate: string;
      }): Promise<any> {
        try {
          const { propertyId, checkInDate, checkOutDate } = bookingData;
          
          // Validate inputs
          if (!propertyId || !checkInDate || !checkOutDate) {
            throw new BadRequestException('Property ID, check-in date, and check-out date are required');
          }

          // Convert propertyId to ObjectId if needed
          const propertyObjectId = typeof propertyId === 'string' && mongoose.Types.ObjectId.isValid(propertyId)
            ? new mongoose.Types.ObjectId(propertyId)
            : propertyId;

          // Find the property
          const property = await this.propertyModel.findById(propertyObjectId).exec();
          
          if (!property) {
            throw new NotFoundException(`Property with ID ${propertyId} not found`);
          }
          
          // Parse the dates
          const checkIn = new Date(checkInDate);
          const checkOut = new Date(checkOutDate);
          
          if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
            throw new BadRequestException('Invalid date format for check-in or check-out');
          }
          
          if (checkIn >= checkOut) {
            throw new BadRequestException('Check-in date must be before check-out date');
          }
          
          // Update availability to mark these dates as unavailable
          // Find availabilities that overlap with the booking period
          const overlappingAvailabilities = property.availabilities.filter(availability => {
            const availStartDate = new Date(availability.start_time);
            const availEndDate = new Date(availability.end_time);
            
            // Check if there's an overlap
            return (checkIn < availEndDate && checkOut > availStartDate);
          });
          
          if (overlappingAvailabilities.length === 0) {
            // No availabilities found for this period
            throw new BadRequestException('No available dates found for the requested booking period');
          }
          
          // Create updated availabilities by splitting existing ones
          const updatedAvailabilities = [...property.availabilities];
          
          // Process each overlapping availability
          for (const availability of overlappingAvailabilities) {
            const availIndex = updatedAvailabilities.findIndex(
              a => a.start_time === availability.start_time && a.end_time === availability.end_time
            );
            
            if (availIndex === -1) continue;
            
            const availStart = new Date(availability.start_time);
            const availEnd = new Date(availability.end_time);
            
            // Remove the original availability
            updatedAvailabilities.splice(availIndex, 1);
            
            // Create segments before and after the booking if needed
            // Segment before the booking
            if (availStart < checkIn) {
              updatedAvailabilities.push({
                ...availability,
                start_time: availStart.toISOString(),
                end_time: checkIn.toISOString()
              });
            }
            
            // Segment after the booking
            if (availEnd > checkOut) {
              updatedAvailabilities.push({
                ...availability,
                start_time: checkOut.toISOString(),
                end_time: availEnd.toISOString()
              });
            }
          }
          
          // Update the property with the new availabilities
          const updatedProperty = await this.propertyModel.findByIdAndUpdate(
            propertyObjectId,
            { availabilities: updatedAvailabilities },
            { new: true }
          ).exec();
          
          if (!updatedProperty) {
            throw new NotFoundException(`Failed to update property with ID ${propertyId}`);
          }
          
          return {
            statusCode: 200,
            message: 'Property availability updated successfully',
            data: updatedProperty
          };
          
        } catch (error) {
          console.error('Error updating property availability:', error);
          
          if (error.status) {
            throw error;
          } else {
            throw new BadRequestException(error.message || 'Failed to update property availability');
          }
        }
      }
     // Add this new method to your property service

async restorePropertyAvailabilityFromSegments(restoreData: {
  propertyId: string;
  segments: Array<{
    start_time: string;
    end_time: string;
    price: number;
    otherPlatformPrice: number;
    isPrice: boolean;
    touristTax: number;
  }>;
  rejectionReason: string;
}): Promise<any> {
  try {
    const { propertyId, segments, rejectionReason } = restoreData;
    
    // Validate inputs
    if (!propertyId || !segments || !Array.isArray(segments) || segments.length === 0) {
      throw new BadRequestException('Property ID and segments are required');
    }

    // Convert propertyId to ObjectId if needed
    const propertyObjectId = typeof propertyId === 'string' && mongoose.Types.ObjectId.isValid(propertyId)
      ? new mongoose.Types.ObjectId(propertyId)
      : propertyId;

    // Find the property
    const property = await this.propertyModel.findById(propertyObjectId).exec();
    
    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }
    
    console.log(`Restoring availability for property ${propertyId} due to ${rejectionReason}`);
    console.log('Segments to restore:', segments);

    // Get current availabilities
    const currentAvailabilities = [...property.availabilities];
    
    // Add each segment back to the availabilities
    for (const segment of segments) {
      // Validate segment dates
      const segmentStart = new Date(segment.start_time);
      const segmentEnd = new Date(segment.end_time);
      
      if (isNaN(segmentStart.getTime()) || isNaN(segmentEnd.getTime())) {
        console.warn(`Invalid segment dates: ${segment.start_time} - ${segment.end_time}`);
        continue;
      }

      if (segmentStart >= segmentEnd) {
        console.warn(`Invalid segment: start date must be before end date`);
        continue;
      }

      // Check if this segment overlaps with any existing availability
      const overlappingAvailability = currentAvailabilities.find(availability => {
        const availStart = new Date(availability.start_time);
        const availEnd = new Date(availability.end_time);
        
        // Check if segment overlaps with this availability
        return (segmentStart < availEnd && segmentEnd > availStart);
      });

      if (overlappingAvailability) {
        // If there's overlap, we need to merge or extend the existing availability
        console.log(`Found overlapping availability, attempting to merge segment ${segment.start_time} - ${segment.end_time}`);
        
        // Find the index of the overlapping availability
        const overlapIndex = currentAvailabilities.findIndex(
          a => a.start_time === overlappingAvailability.start_time && 
               a.end_time === overlappingAvailability.end_time
        );
        
        if (overlapIndex !== -1) {
          const existingAvail = currentAvailabilities[overlapIndex];
          const existingStart = new Date(existingAvail.start_time);
          const existingEnd = new Date(existingAvail.end_time);
          
          // Check if the segment has the same pricing structure
          const samePricing = (
            existingAvail.price === segment.price &&
            existingAvail.otherPlatformPrice === segment.otherPlatformPrice &&
            existingAvail.isPrice === segment.isPrice &&
            existingAvail.touristTax === segment.touristTax
          );
          
          if (samePricing) {
            // Extend the existing availability to include the segment
            const newStart = segmentStart < existingStart ? segmentStart : existingStart;
            const newEnd = segmentEnd > existingEnd ? segmentEnd : existingEnd;
            
            currentAvailabilities[overlapIndex] = {
              ...existingAvail,
              start_time: newStart.toISOString(),
              end_time: newEnd.toISOString()
            };
            
            console.log(`Extended existing availability to ${newStart.toISOString()} - ${newEnd.toISOString()}`);
          } else {
            // Different pricing, add as separate segment
            currentAvailabilities.push({
              start_time: segment.start_time,
              end_time: segment.end_time,
              price: segment.price,
              otherPlatformPrice: segment.otherPlatformPrice,
              isPrice: segment.isPrice,
              touristTax: segment.touristTax
            });
            
            console.log(`Added segment with different pricing: ${segment.start_time} - ${segment.end_time}`);
          }
        }
      } else {
        // No overlap, add the segment as a new availability
        currentAvailabilities.push({
          start_time: segment.start_time,
          end_time: segment.end_time,
          price: segment.price,
          otherPlatformPrice: segment.otherPlatformPrice,
          isPrice: segment.isPrice,
          touristTax: segment.touristTax
        });
        
        console.log(`Added new availability segment: ${segment.start_time} - ${segment.end_time}`);
      }
    }

    // Sort availabilities by start time for better organization
    currentAvailabilities.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // Merge adjacent availabilities with same pricing
    const mergedAvailabilities = this.mergeAdjacentAvailabilities(currentAvailabilities);

    // Update the property with the restored availabilities
    const updatedProperty = await this.propertyModel.findByIdAndUpdate(
      propertyObjectId,
      { availabilities: mergedAvailabilities },
      { new: true }
    ).exec();
    
    if (!updatedProperty) {
      throw new NotFoundException(`Failed to update property with ID ${propertyId}`);
    }
    
    console.log(`Successfully restored availability for property ${propertyId}`);
    
    return {
      statusCode: 200,
      message: 'Property availability restored successfully',
      data: updatedProperty,
      restoredSegments: segments.length,
      rejectionReason
    };
    
  } catch (error) {
    console.error('Error restoring property availability:', error);
    
    if (error.status) {
      throw error;
    } else {
      throw new BadRequestException(error.message || 'Failed to restore property availability');
    }
  }
}

// Helper method to merge adjacent availabilities with same pricing
private mergeAdjacentAvailabilities(availabilities: any[]): any[] {
  if (availabilities.length <= 1) return availabilities;

  const merged = [availabilities[0]];
  
  for (let i = 1; i < availabilities.length; i++) {
    const current = availabilities[i];
    const lastMerged = merged[merged.length - 1];
    
    const lastEnd = new Date(lastMerged.end_time);
    const currentStart = new Date(current.start_time);
    
    // Check if they're adjacent (end time of last equals start time of current)
    // and have the same pricing
    const areAdjacent = lastEnd.getTime() === currentStart.getTime();
    const samePricing = (
      lastMerged.price === current.price &&
      lastMerged.otherPlatformPrice === current.otherPlatformPrice &&
      lastMerged.isPrice === current.isPrice &&
      lastMerged.touristTax === current.touristTax
    );
    
    if (areAdjacent && samePricing) {
      // Merge with the last availability
      lastMerged.end_time = current.end_time;
    } else {
      // Add as separate availability
      merged.push(current);
    }
  }
  
  return merged;
} 
}