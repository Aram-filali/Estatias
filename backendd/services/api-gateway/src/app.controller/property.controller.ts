import { Controller, Post, Body, UseInterceptors, UploadedFiles, 
  Req, HttpException, HttpStatus, Get, Param, Delete, Patch, Query } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { firstValueFrom } from 'rxjs';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../firebase/firebase-auth.guards'; 

// Interfaces pour la génération AI
interface GenerateContentDto {
  propertyType: string;
  location: string;
  userPrompt: string;
  features?: string[];
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'luxury' | 'friendly';
  language?: string;
}

interface GeneratedContent {
  title: string;
  description: string;
  tags: string[];
  seoKeywords: string[];
  suggestions: string[];
}

@Controller('properties')
export class PropertyController {
  constructor(
    @Inject('PROPERTY_SERVICE') private propertyClient: ClientProxy,
    private readonly firebaseAuthGuard: FirebaseAuthGuard
  ) {}

  // =================== ENDPOINTS EXISTANTS ===================

  @Post()
  async createProperty(@Body() propertyData: any, @Req() req: any) {
    try {
      // Validation des données
      if (!propertyData.firebaseUid) {
        throw new HttpException(
          'Firebase UID is required',
          HttpStatus.BAD_REQUEST
        );
      }

      // Appel au microservice avec les données qui contiennent déjà les URLs Firebase
      const response = await firstValueFrom(
        this.propertyClient.send({ cmd: 'create_property' }, propertyData)
      );

      // Gestion de la réponse
      if (!response || response.statusCode !== 201) {
        throw new HttpException(
          response?.error || 'Error creating property',
          response?.statusCode || HttpStatus.BAD_REQUEST
        );
      }

      // Transformation de la réponse
      return this.transformPropertyResponse(response.data);
    } catch (err) {
      console.error('Error in property creation:', err);
      throw new HttpException(
        err?.message || 'Unexpected error while creating property',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private transformPropertyResponse(property: any) {
    // Si c'est déjà un objet simple
    if (property && !property.toObject) {
      return {
        ...property,
        id: property._id?.toString() || property.id,
        _id: property._id?.toString()
      };
    }
  
    // Si c'est un document Mongoose
    if (property?.toObject) {
      const propertyObj = property.toObject({
        versionKey: false,
        transform: (doc, ret) => {
          ret.id = ret._id.toString();
          return ret;
        }
      });
      return propertyObj;
    }
  
    throw new Error('Invalid property response format');
  }


  
  @Get('all')
  async getAllProperties() {
    try {
      const response = await firstValueFrom(
        this.propertyClient.send({ cmd: 'get_properties' }, {})
      );
      
      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Error retrieving properties',
          response.statusCode
        );
      }
      
      return response.data;
    } catch (err) {
      throw new HttpException(
        err?.message || 'Error retrieving properties',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  @Get('host/:hostId')
  async getPropertiesByHostId(@Param('hostId') hostId: string) {
    try {
      console.log(`Finding properties for host with ID: ${hostId}`);
      
      const response = await firstValueFrom(
        this.propertyClient.send(
          { cmd: 'get_properties_by_host_id' },
          { hostId }
        )
      );
      
      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Error retrieving properties',
          response.statusCode
        );
      }
      
      return response.data;
    } catch (err) {
      throw new HttpException(
        err?.message || 'Error retrieving properties',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(FirebaseAuthGuard)
  async getPropertiesByUser(@Req() req: any) {
    try {
      const firebaseUid = req.user.uid;
      const response = await firstValueFrom(
        this.propertyClient.send(
          { cmd: 'get_properties_by_firebase_uid' }, 
          { firebaseUid }
        )
      );
      
      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Error retrieving properties', 
          response.statusCode
        );
      }
      
      return response.data;
    } catch (err) {
      throw new HttpException(
        err?.message || 'Error retrieving properties',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('photos/:firebaseUid')
  async getPropertyPhotosByFirebaseUid(@Param('firebaseUid') firebaseUid: string) {
    try {
      console.log(`Fetching property photos for user with firebaseUid: ${firebaseUid}`);
      
      const response = await firstValueFrom(
        this.propertyClient.send(
          { cmd: 'get_property_photos_by_firebase_uid' },
          { firebaseUid }
        )
      );
      
      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Error retrieving property photos',
          response.statusCode
        );
      }
      
      return response.data;
    } catch (err) {
      throw new HttpException(
        err?.message || 'Error retrieving property photos',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getPropertyById(@Param('id') id: string, @Req() req) {
    // Comprehensive request logging
    console.group('🔍 Property Retrieval Request');
    console.log('🆔 Requested Property ID:', id);
    console.log('📍 Full Request Path:', req.url);
    console.log('🌐 Request Headers:', req.headers);
    console.log('🔑 Authentication User:', req.user);
    console.log('📦 Request Query Params:', req.query);
    console.log('📝 Request Body:', req.body);
    console.groupEnd();

    try {
      const response = await firstValueFrom(
        this.propertyClient.send({ cmd: 'get_property_by_id' }, { id })
      );

      // Detailed response logging
      console.group('✅ Microservice Response');
      console.log('📦 Response Data:', response);
      console.log('🔢 Status Code:', response?.statusCode);
      console.log('❓ Response Existence:', !!response);
      console.groupEnd();

      if (!response || response.statusCode !== 200) {
        console.error('❌ Property Retrieval Failed', {
          statusCode: response?.statusCode,
          error: response?.error,
          inputId: id
        });
        
        throw new HttpException(
          response?.error || 'Property not found',
          response?.statusCode || HttpStatus.NOT_FOUND
        );
      }

      return this.transformPropertyResponse(response.data);
    } catch (err) {
      console.group('❌ Comprehensive Error');
      console.error('📝 Error Message:', err.message);
      console.error('🗺️ Error Stack:', err.stack);
      console.error('🆔 Input ID:', id);
      console.error('🏷️ Error Type:', err.constructor.name);
      console.groupEnd();

      throw new HttpException(
        err?.message || 'Error retrieving property',
        err?.status || HttpStatus.NOT_FOUND
      );
    }
  }

  @Patch(':id')
  async updateProperty(
    @Body() propertyData: any,
    @Param('id') id: string,
  ) {
    try {
      const response = await firstValueFrom(
        this.propertyClient.send({ cmd: 'update_property' }, { id, updateData: propertyData })
      );

      if (response.statusCode !== 200) {
        throw new HttpException(response.error, response.statusCode);
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.message || 'Update failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  async deleteProperty(
    @Param('id') id: string,
    @Req() req: any
  ) {
    try {
      const firebaseUid = req.user.uid;
      const response = await firstValueFrom(
        this.propertyClient.send(
          { cmd: 'delete_property' }, 
          { id, firebaseUid }
        )
      );
      
      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Error deleting property', 
          response.statusCode
        );
      }
      
      return response.data;
    } catch (err) {
      throw new HttpException(
        err?.message || 'Error deleting property',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



@Patch(':id/status')
async updatePropertyStatus(@Param('id') id: string, @Body() updateData: { status: string }) {
  try {
    console.log('API Gateway - Received ID:', id); // Add this
    console.log('API Gateway - Received body:', updateData); // Add this
    
    const response = await firstValueFrom(
      this.propertyClient.send({ cmd: 'update_property_status' }, { id, status: updateData.status })
    );
    
    if (response.statusCode !== 200) {
      throw new HttpException(
        response.error || 'Error updating property status',
        response.statusCode
      );
    }
    
    return response.data;
  } catch (err) {
    throw new HttpException(
      err?.message || 'Error updating property status',
      err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}













  // =================== NEW AI ENDPOINTS ===================

/**
 * Generates optimized content for a property with AI
 */
@Post('ai/generate-content')
  // @UseGuards(AuthGuard('jwt')) // Uncomment if you use authentication
  async generateOptimizedContent(
    @Body() generateContentDto: GenerateContentDto,
    @Req() req: any
  ): Promise<{ data: GeneratedContent }> {
    try {
      console.log('🤖 AI Content Generation Request:', generateContentDto);

      // Data validation
      if (!generateContentDto.propertyType || !generateContentDto.location || !generateContentDto.userPrompt) {
        throw new HttpException(
          'Missing data: property type, location and user prompt are required',
          HttpStatus.BAD_REQUEST
        );
      }

      // Add firebaseUid for tracking/audit (if using auth)
      const requestData = {
        ...generateContentDto,
        firebaseUid: req.user?.uid || 'anonymous', // Make optional for testing
        requestTimestamp: new Date().toISOString()
      };

      const response = await firstValueFrom(
        this.propertyClient.send(
          { cmd: 'generate_optimized_content' },
          requestData
        )
      );

      if (!response || response.statusCode !== 200) {
        throw new HttpException(
          response?.error || 'Error during AI content generation',
          response?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      console.log('✅ AI Content Generated Successfully');
      
      // Return in consistent format
      return {
        data: response.data
      };

    } catch (err) {
      console.error('❌ AI Content Generation Error:', err);
      throw new HttpException(
        err?.message || 'Error during AI content generation',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // This creates: POST /properties/ai/content-suggestions
  @Post('ai/content-suggestions')
  // @UseGuards(AuthGuard('jwt')) // Uncomment if you use authentication
  async getContentSuggestions(
    @Body() contentSuggestionsDto: any,
    @Req() req: any
  ): Promise<{ data: string[] }> {
    try {
      console.log('💡 Content Suggestions Request:', contentSuggestionsDto);

      // Data validation
      if (!contentSuggestionsDto.propertyType || !contentSuggestionsDto.location) {
        throw new HttpException(
          'Missing data: property type and location are required',
          HttpStatus.BAD_REQUEST
        );
      }

      // For now, return default suggestions based on property type
      // Later you can implement AI-based suggestions
      const suggestions = this.getDefaultSuggestions(contentSuggestionsDto.propertyType);

      console.log('✅ Content Suggestions Generated Successfully');
      
      return {
        data: suggestions
      };

    } catch (err) {
      console.error('❌ Content Suggestions Error:', err);
      throw new HttpException(
        err?.message || 'Error loading content suggestions',
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private getDefaultSuggestions(propertyType: string): string[] {
    const type = propertyType?.toLowerCase();
    
    if (type === 'villa') {
      return [
        'Highlight the outdoor space and pool',
        'Mention the view and privacy',
        'Emphasize luxury and comfort',
        'Describe the garden and landscaping',
        'Mention parking and garage space'
      ];
    } else if (type === 'apartment') {
      return [
        'Highlight the central location',
        'Mention public transportation',
        'Emphasize modernity and amenities',
        'Describe the building facilities',
        'Mention nearby shopping and dining'
      ];
    } else if (type === 'hotel') {
      return [
        'Highlight hotel services',
        'Mention breakfast and services',
        'Emphasize professional hospitality',
        'Describe room amenities',
        'Mention location benefits'
      ];
    } else if (type === 'house') {
      return [
        'Highlight the family-friendly features',
        'Mention the neighborhood',
        'Emphasize space and comfort',
        'Describe outdoor areas',
        'Mention nearby schools and amenities'
      ];
    } else {
      return [
        'Describe the unique atmosphere of the place',
        'Highlight main amenities',
        'Mention nearby attractions',
        'Use local keywords in your description',
        'Emphasize what makes it special'
      ];
    }
  }

/**
 * Validates OpenAI configuration
 */
@Get('ai/validate-config')
@UseGuards(FirebaseAuthGuard)
async validateOpenAIConfig(@Req() req: any): Promise<{ isValid: boolean; message: string }> {
  try {
    console.log('🔍 Validating OpenAI Configuration');

    const response = await firstValueFrom(
      this.propertyClient.send(
        { cmd: 'validate_openai_config' },
        { firebaseUid: req.user.uid }
      )
    );

    if (!response) {
      throw new HttpException(
        'Error during configuration validation',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return response;

  } catch (err) {
    console.error('❌ OpenAI Config Validation Error:', err);
    return {
      isValid: false,
      message: 'Error during OpenAI configuration validation'
    };
  }
}

/**
 * Gets content suggestions based on property type
 */

/**
 * Endpoint to regenerate content for an existing property
 */
@Post('ai/regenerate-content/:propertyId')
@UseGuards(FirebaseAuthGuard)
async regeneratePropertyContent(
  @Param('propertyId') propertyId: string,
  @Body() regenerateParams: Partial<GenerateContentDto>,
  @Req() req: any
): Promise<GeneratedContent> {
  try {
    console.log(`🔄 Regenerating content for property ${propertyId}`);

    // Get property data
    const propertyResponse = await firstValueFrom(
      this.propertyClient.send(
        { cmd: 'get_property_by_id' },
        { id: propertyId }
      )
    );

    if (!propertyResponse || propertyResponse.statusCode !== 200) {
      throw new HttpException(
        'Property not found',
        HttpStatus.NOT_FOUND
      );
    }

    const property = propertyResponse.data;

    // Prepare data for generation
    const generateData: GenerateContentDto = {
      propertyType: regenerateParams.propertyType || property.propertyType,
      location: regenerateParams.location || property.location || `${property.city}, ${property.country}`,
      userPrompt: regenerateParams.userPrompt || `Regenerate content for this ${property.propertyType}`,
      features: regenerateParams.features || property.features || [],
      targetAudience: regenerateParams.targetAudience,
      tone: regenerateParams.tone || 'professional',
      language: regenerateParams.language || 'en'
    };

    const response = await firstValueFrom(
      this.propertyClient.send(
        { cmd: 'generate_optimized_content' },
        {
          ...generateData,
          propertyId,
          firebaseUid: req.user.uid,
          isRegeneration: true
        }
      )
    );

    if (!response || response.statusCode !== 200) {
      throw new HttpException(
        response?.error || 'Error during content regeneration',
        response?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return response.data;

  } catch (err) {
    console.error('❌ Content Regeneration Error:', err);
    throw new HttpException(
      err?.message || 'Error during content regeneration',
      err?.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Endpoint to get AI generation history
 */
@Get('ai/generation-history')
@UseGuards(FirebaseAuthGuard)
async getAIGenerationHistory(@Req() req: any, @Query('limit') limit?: number) {
  try {
    const response = await firstValueFrom(
      this.propertyClient.send(
        { cmd: 'get_ai_generation_history' },
        { 
          firebaseUid: req.user.uid,
          limit: limit || 10
        }
      )
    );

    if (!response || response.statusCode !== 200) {
      throw new HttpException(
        response?.error || 'Error retrieving history',
        response?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return response.data;

  } catch (err) {
    console.error('❌ AI History Error:', err);
    throw new HttpException(
      err?.message || 'Error retrieving AI history',
      err?.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

// =================== AI UTILITY METHODS ===================

/**
 * Default suggestions in case of microservice error
 */





















  @Post('reviews')
 @UseGuards(FirebaseAuthGuard)
async createReview(@Body() createReviewDto: any, @Req() req) {
  console.group('🌟 Create Review Request');
  console.log('📝 Review Data:', createReviewDto);
  console.log('👤 User:', req.user);
  console.groupEnd();

  try {
    const reviewData = {
      ...createReviewDto,
      userEmail: req.user.email
    };

    const response = await firstValueFrom(
      this.propertyClient.send({ cmd: 'create_review' }, reviewData)
    );

    console.group('✅ Create Review Response');
    console.log('📦 Response:', response);
    console.groupEnd();

    if (!response || response.statusCode !== 201) {
      throw new HttpException(
        response?.error || 'Failed to create review',
        response?.statusCode || HttpStatus.BAD_REQUEST
      );
    }

    return response;
  } catch (err) {
    console.group('❌ Create Review Error');
    console.error('📝 Error:', err);
    console.groupEnd();

    throw new HttpException(
      err?.message || 'Error creating review',
      err?.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

@Get(':propertyId/reviews')
 //@UseGuards(FirebaseAuthGuard)
async getPropertyReviews(
  @Param('propertyId') propertyId: string,
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10
) {
  console.group('📖 Get Reviews Request');
  console.log('🆔 Property ID:', propertyId);
  console.log('📄 Page:', page);
  console.log('📊 Limit:', limit);
  console.groupEnd();

  try {
    const response = await firstValueFrom(
      this.propertyClient.send({ cmd: 'get_reviews_by_property' }, {
        propertyId,
        page: Number(page),
        limit: Number(limit)
      })
    );

    console.group('✅ Get Reviews Response');
    console.log('📦 Response:', response);
    console.groupEnd();

    if (!response || response.statusCode !== 200) {
      throw new HttpException(
        response?.error || 'Failed to get reviews',
        response?.statusCode || HttpStatus.NOT_FOUND
      );
    }

    return response;
  } catch (err) {
    console.group('❌ Get Reviews Error');
    console.error('📝 Error:', err);
    console.groupEnd();

    throw new HttpException(
      err?.message || 'Error retrieving reviews',
      err?.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}





@Get('host/:hostUid/reviews')
//@UseGuards(FirebaseAuthGuard)
async getReviewsByHost(
  @Param('hostUid') hostUid: string,
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 10,
  @Req() req
) {
  console.group('🏠 Get Host Reviews Request');  
  console.log('🆔 Host UID:', hostUid);
  console.log('📄 Page:', page);
  console.log('📊 Limit:', limit);
  console.log('👤 Requesting User:', req.user);
  console.groupEnd();

  try {
    // Optional: Add authorization check to ensure only the host can view their reviews
    // if (req.user.uid !== hostUid && req.user.role !== 'admin') {
    //   throw new HttpException('Unauthorized to view these reviews', HttpStatus.UNAUTHORIZED);
    // }

    const response = await firstValueFrom(
      this.propertyClient.send({ cmd: 'get_reviews_by_host' }, {
        hostUid,
        page: Number(page),
        limit: Number(limit)
      })
    );

    console.group('✅ Get Host Reviews Response');
    console.log('📦 Response:', response);
    console.groupEnd();

    if (!response || response.statusCode !== 200) {
      throw new HttpException(
        response?.error || 'Failed to get host reviews',
        response?.statusCode || HttpStatus.NOT_FOUND
      );
    }

    return response;
  } catch (err) {
    console.group('❌ Get Host Reviews Error');
    console.error('📝 Error:', err);
    console.groupEnd();

    throw new HttpException(
      err?.message || 'Error retrieving host reviews',
      err?.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

@Patch('reviews/:reviewId')
 @UseGuards(FirebaseAuthGuard)
async updateReview(
  @Param('reviewId') reviewId: string,
  @Body() updateReviewDto: any,
  @Req() req
) {
  console.group('✏️ Update Review Request');
  console.log('🆔 Review ID:', reviewId);
  console.log('📝 Update Data:', updateReviewDto);
  console.log('👤 User:', req.user);
  console.groupEnd();

  try {
    const response = await firstValueFrom(
      this.propertyClient.send({ cmd: 'update_review' }, {
        reviewId,
        userEmail: req.user.email,
        ...updateReviewDto
      })
    );

    console.group('✅ Update Review Response');
    console.log('📦 Response:', response);
    console.groupEnd();

    if (!response || response.statusCode !== 200) {
      throw new HttpException(
        response?.error || 'Failed to update review',
        response?.statusCode || HttpStatus.BAD_REQUEST
      );
    }

    return response;
  } catch (err) {
    console.group('❌ Update Review Error');
    console.error('📝 Error:', err);
    console.groupEnd();

    throw new HttpException(
      err?.message || 'Error updating review',
      err?.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

@Delete('reviews/:reviewId')
 @UseGuards(FirebaseAuthGuard)
async deleteReview(@Param('reviewId') reviewId: string, @Req() req) {
  console.group('🗑️ Delete Review Request');
  console.log('🆔 Review ID:', reviewId);
  console.log('👤 User:', req.user);
  console.groupEnd();

  try {
    const response = await firstValueFrom(
      this.propertyClient.send({ cmd: 'delete_review' }, {
        reviewId,
        userEmail: req.user.email
      })
    );

    console.group('✅ Delete Review Response');
    console.log('📦 Response:', response);
    console.groupEnd();

    if (!response || response.statusCode !== 200) {
      throw new HttpException(
        response?.error || 'Failed to delete review',
        response?.statusCode || HttpStatus.BAD_REQUEST
      );
    }

    return response;
  } catch (err) {
    console.group('❌ Delete Review Error');
    console.error('📝 Error:', err);
    console.groupEnd();

    throw new HttpException(
      err?.message || 'Error deleting review',
      err?.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

@Get(':propertyId/user-review')
 @UseGuards(FirebaseAuthGuard)
async getUserReviewForProperty(@Param('propertyId') propertyId: string, @Req() req) {
  console.group('👤 Get User Review Request');
  console.log('🆔 Property ID:', propertyId);
  console.log('👤 User:', req.user);
  console.groupEnd();

  try {
    const response = await firstValueFrom(
      this.propertyClient.send({ cmd: 'get_user_review_for_property' }, {
        propertyId,
        userEmail: req.user.email
      })
    );

    console.group('✅ Get User Review Response');
    console.log('📦 Response:', response);
    console.groupEnd();

    if (!response || response.statusCode !== 200) {
      throw new HttpException(
        response?.error || 'Failed to get user review',
        response?.statusCode || HttpStatus.NOT_FOUND
      );
    }

    return response;
  } catch (err) {
    console.group('❌ Get User Review Error');
    console.error('📝 Error:', err);
    console.groupEnd();

    throw new HttpException(
      err?.message || 'Error retrieving user review',
      err?.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

}
}