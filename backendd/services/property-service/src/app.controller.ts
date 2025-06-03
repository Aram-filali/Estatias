import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PropertyService } from './app.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

@Controller()
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @MessagePattern({ cmd: 'create_property' })
  async createProperty(@Payload() createPropertyDto: CreatePropertyDto) {
    try {
      // Validation des données requises
      if (!createPropertyDto.firebaseUid) {
        return { 
          statusCode: 400, 
          data: null, 
          error: 'Firebase UID is required' 
        };
      }
  
      // Log des données pour le débogage
      console.log('Processing property creation with data:', {
        title: createPropertyDto.title,
        firebaseUid: createPropertyDto.firebaseUid,
        photoCount: createPropertyDto.mainPhotos?.length || 0,
        spacesCount: createPropertyDto.apartmentSpaces?.length || 0
      });
  
      // Création de la propriété
      const property = await this.propertyService.createProperty(createPropertyDto);
      
      // Préparation de la réponse avec transformation sécurisée
      let propertyData;
      if (property && typeof property.toJSON === 'function') {
        propertyData = property.toJSON();
      } else if (property && typeof property.toObject === 'function') {
        propertyData = property.toObject();
      } else {
        propertyData = property;
      }
  
      // Transformation standardisée pour le frontend
      const responseData = {
        ...propertyData,
        id: propertyData._id ? propertyData._id.toString() : undefined,
        _id: propertyData._id ? propertyData._id.toString() : undefined
      };
  
      return { 
        statusCode: 201, 
        data: responseData 
      };
    } catch (err) {
      console.error('Error creating property:', err);
      
      // Gestion des erreurs spécifiques
      let errorMessage = 'Failed to create property';
      let statusCode = 400;
      
      if (err.name === 'ValidationError') {
        errorMessage = `Validation error: ${err.message}`;
        statusCode = 422;
      } else if (err.code === 11000) {
        errorMessage = 'Duplicate key error';
        statusCode = 409;
      }
  
      return {
        statusCode: err.status || statusCode,
        data: null,
        error: err.message || errorMessage
      };
    }
  }

  @MessagePattern({ cmd: 'get_properties' })
  async getProperties() {
    try {
      console.log('Fetching all properties from database');
      const properties = await this.propertyService.findAll();
      return { statusCode: 200, data: properties };
    } catch (err) {
      console.error('Error getting properties:', err);
      return {
        statusCode: err.status || 500,
        data: null,
        error: err.message || 'Failed to retrieve properties'
      };
    }
  }

  @MessagePattern({ cmd: 'get_properties_by_host_id' })
async getPropertiesByHostId(@Payload() data: { hostId: string }) {
  try {
    console.log(`Finding properties for host with ID: ${data.hostId}`);
    
    // If your hostId is actually the firebaseUid
    const properties = await this.propertyService.findByFirebaseUid(data.hostId);
    console.log(`Found ${properties.length} properties for host ID: ${data.hostId}`);
    
    // Transformation standardisée pour chaque propriété
    const transformed = properties.map(prop => ({
      ...(prop.toObject ? prop.toObject() : prop),
      id: prop._id?.toString() || prop.id
    }));
    
    return {
      statusCode: 200,
      data: transformed.filter(p => p.id) // Filtrer les propriétés sans ID
    };
  } catch (err) {
    console.error(`Error finding properties for host ID ${data.hostId}:`, err);
    return {
      statusCode: err.status || 500,
      data: null,
      error: err.message || 'Failed to retrieve properties for this host'
    };
  }
}

@MessagePattern({ cmd: 'get_property_photos_by_firebase_uid' })
  async getPropertyPhotosByFirebaseUid(@Payload() data: { firebaseUid: string }) {
    try {
      console.log(`Finding property photos for user with firebaseUid: ${data.firebaseUid}`);
      
      const photosData = await this.propertyService.getPropertyPhotosByFirebaseUid(data.firebaseUid);
      
      console.log(`Found photos data for ${photosData.length} properties`);
      
      return {
        statusCode: 200,
        data: photosData
      };
    } catch (err) {
      console.error(`Error finding property photos for firebaseUid ${data.firebaseUid}:`, err);
      return {
        statusCode: err.status || 500,
        data: null,
        error: err.message || 'Failed to retrieve property photos for this user'
      };
    }
  }
  



  @MessagePattern({ cmd: 'get_properties_by_firebase_uid' })
  async getPropertiesByFirebaseUid(@Payload() data: { firebaseUid: string }) {
    try {
      console.log(`Finding properties for host with firebaseUid: ${data.firebaseUid}`);
      const properties = await this.propertyService.findByFirebaseUid(data.firebaseUid);
      console.log(`Found ${properties.length} properties for firebaseUid: ${data.firebaseUid}`);
      
      // Transformation standardisée pour chaque propriété
      const transformed = properties.map(prop => ({
        ...(prop.toObject ? prop.toObject() : prop),
        id: prop._id?.toString() || prop.id
      }));
      
      return { 
        statusCode: 200, 
        data: transformed.filter(p => p.id) // Filtrer les propriétés sans ID
      };
    } catch (err) {
      console.error(`Error finding properties for firebaseUid ${data.firebaseUid}:`, err);
      return {
        statusCode: err.status || 500,
        data: null,
        error: err.message || 'Failed to retrieve properties for this user'
      };
    }
  }

  @MessagePattern({ cmd: 'get_property_by_id' })
  async getPropertyById(@Payload() data: { id: string }) {
    try {
      console.log('Received request for property ID:', data.id);
      
      console.time('PropertyQuery');
      const property = await this.propertyService.findById(data.id);
      console.timeEnd('PropertyQuery');
      
      if (!property) {
        console.warn('Property not found with ID:', data.id);
        return { 
          statusCode: 404, 
          error: 'Property not found',
          data: null 
        };
      }

      // Transformation standardisée
      const responseData = {
        ...(property.toObject?.() || property),
        id: property._id?.toString() || property.id
      };

      console.log('Returning property data for ID:', data.id);
      return { statusCode: 200, data: responseData };
    } catch (err) {
      console.error('Error in getPropertyById:', {
        error: err.message,
        stack: err.stack,
        inputId: data.id
      });
      
      return {
        statusCode: err.status || 500,
        error: err.message || 'Internal server error',
        data: null
      };
    }
  }

  @MessagePattern({ cmd: 'delete_property' })
  async deleteProperty(@Payload() data: { id: string, firebaseUid?: string }) {
    try {
      console.log(`Deleting property with ID ${data.id} by user ${data.firebaseUid || 'admin'}`);
      
      // Vérification de propriété avec firebaseUid si fourni
      let result;
      if (data.firebaseUid) {
        result = await this.propertyService.remove(data.id, data.firebaseUid);
      } else {
        // Pour suppression admin/système sans vérification firebaseUid
        result = await this.propertyService.remove(data.id);
      }
      
      console.log(`Property deletion result for ID ${data.id}:`, result);
      return { statusCode: 200, data: result };
    } catch (err) {
      console.error('Error deleting property:', err);
      return {
        statusCode: err.status || 400,
        data: null,
        error: err.message || 'Failed to delete property'
      };
    }
  }

  @MessagePattern({ cmd: 'update_property' })
  async updateProperty(@Payload() data: { id: string; updateData: UpdatePropertyDto }) {
    try {
      console.log(`Updating property with ID ${data.id}`);
      
      // Validation des données supprimées
      if (data.updateData.deletedMainPhotos && !Array.isArray(data.updateData.deletedMainPhotos)) {
        data.updateData.deletedMainPhotos = [];
      }
      
      if (data.updateData.deletedSpaces && !Array.isArray(data.updateData.deletedSpaces)) {
        data.updateData.deletedSpaces = [];
      }
      
      if (data.updateData.deletedSpacePhotos && !Array.isArray(data.updateData.deletedSpacePhotos)) {
        data.updateData.deletedSpacePhotos = [];
      }
  
      // Normaliser les photos d'espaces
      if (data.updateData.apartmentSpaces) {
        data.updateData.apartmentSpaces = data.updateData.apartmentSpaces.map(space => ({
          space_id: space.space_id || `space_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: space.type || '',
          area: space.area || 0,
          photos: space.photos || []
        }));
      }
  
      const updatedProperty = await this.propertyService.updateProperty(data.id, data.updateData);
      
      // Transformation standardisée pour la réponse
      const responseData = {
        ...(updatedProperty.toObject?.() || updatedProperty),
        id: updatedProperty._id?.toString() || updatedProperty.id
      };
      
      console.log(`Property updated successfully: ${data.id}`);
      return {
        statusCode: 200,
        data: responseData
      };
    } catch (err) {
      console.error(`Error updating property ${data.id}:`, err);
      return {
        statusCode: err.status || 400,
        data: null,
        error: err.message || 'Failed to update property'
      };
    }
  }
  
  @MessagePattern({ cmd: 'search_properties' })
  async searchProperties(@Payload() filters: any) {
    try {
      console.log('Searching properties with filters:', filters);
      
      const properties = await this.propertyService.searchProperties(filters);
      
      // Transformation standardisée pour chaque propriété
      const transformed = properties.map(prop => ({
        ...(prop.toObject ? prop.toObject() : prop),
        id: prop._id?.toString() || prop.id
      }));
      
      console.log(`Found ${transformed.length} properties matching filters`);
      return { 
        statusCode: 200, 
        data: transformed 
      };
    } catch (err) {
      console.error('Error searching properties:', err);
      return {
        statusCode: err.status || 500,
        data: null,
        error: err.message || 'Failed to search properties'
      };
    }
  }



  // Add this handler to PropertyController class

@MessagePattern('booking_approved')
async updateAvailabilityForBooking(@Payload() bookingData: {
  bookingId: string;
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
}) {
  try {
    console.log('Received booking_approved event:', bookingData);
    
    // Validate input data
    if (!bookingData || !bookingData.propertyId || !bookingData.checkInDate || !bookingData.checkOutDate) {
      return {
        statusCode: 400,
        message: 'Invalid booking data. Missing required fields.',
        error: 'Bad Request'
      };
    }

    // Process only approved bookings
    if (bookingData.status !== 'approved') {
      return {
        statusCode: 400,
        message: 'Booking is not in approved status',
        error: 'Bad Request'
      };
    }
    
    // Update property availability
    const result = await this.propertyService.updatePropertyAvailabilityForBooking({
      propertyId: bookingData.propertyId,
      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate
    });
    
    console.log('Property availability updated successfully');
    return result;
    
  } catch (err) {
    console.error('Error processing booking_approved event:', err);
    
    return {
      statusCode: err.status || 500,
      message: err.message || 'Failed to update property availability',
      error: err.name || 'Internal Server Error'
    };
  }
}

@MessagePattern('booking_rejected')
async restoreAvailabilityForRejectedBooking(@Payload() bookingData: {
  bookingId: string;
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  segments: Array<{
    start_time: string;
    end_time: string;
    price: number;
    otherPlatformPrice: number;
    isPrice: boolean;
    touristTax: number;
  }>;
  status: string;
  rejectionReason: string;
}) {
  try {
    console.log('Received booking_rejected event:', bookingData);
        
    // Validate input data
    if (!bookingData || !bookingData.propertyId || !bookingData.segments || !Array.isArray(bookingData.segments)) {
      return {
        statusCode: 400,
        message: 'Invalid booking data. Missing required fields or segments.',
        error: 'Bad Request'
      };
    }

    // Process only rejected bookings
    if (bookingData.status !== 'rejected') {
      return {
        statusCode: 400,
        message: 'Booking is not in rejected status',
        error: 'Bad Request'
      };
    }
        
    // Restore property availability using segments
    const result = await this.propertyService.restorePropertyAvailabilityFromSegments({
      propertyId: bookingData.propertyId,
      segments: bookingData.segments,
      rejectionReason: bookingData.rejectionReason
    });
        
    console.log('Property availability restored successfully');
    return result;
      
  } catch (err) {
    console.error('Error processing booking_rejected event:', err);
        
    return {
      statusCode: err.status || 500,
      message: err.message || 'Failed to restore property availability',
      error: err.name || 'Internal Server Error'
    };
  }
}
}