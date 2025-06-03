// src/controllers/ai.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AIService, GenerateContentDto as ServiceGenerateContentDto, GeneratedContent as ServiceGeneratedContent } from './ai.service';

// Interface pour le contrôleur - maintenant compatible avec le service
interface GenerateContentDto {
  // Basic property info
  propertyType: string;
  location: string;
  title?: string;
  description?: string;
  
  // Property details
  size?: number;
  floorNumber?: number;
  lotSize?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  beds_Number?: number;
  numberOfBalconies?: number;
  maxGuest?: number;
  minNight?: number;
  maxNight?: number;
  
  // Property spaces
  apartmentSpaces?: Array<{
    space_id: string;
    type: string;
    area: string;
    photos: File[];
  }>;
  
  // Location details
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  country?: string;
  
  // Amenities - accepte les deux formats
  amenities?: {
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
  } | string[]; // Accepte aussi un array de strings pour compatibilité
  
  // Policies
  policies?: {
    smoking?: boolean;
    pets?: boolean;
    parties_or_events?: boolean;
    guests_allowed?: boolean;
    check_in_start?: string;
    check_in_end?: string;
    check_out_start?: string;
    check_out_end?: string;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    cleaning_maintenance?: string;
    cancellation_policy?: string;
  };
  
  // Payment methods
  paymentMethods?: string[];
  
  // Contact info
  phone?: string;
  email?: string;
  website?: string;
  
  // Generation preferences
  userPrompt: string;
  targetAudience?: string;
  tone?: string;
  language?: string;
  features?: string[];
  
  // Champs additionnels pour le microservice
  firebaseUid?: string;
  propertyId?: string;
  isRegeneration?: boolean;
  requestTimestamp?: string;
}

// Interface de retour simplifiée pour le microservice
interface GeneratedContentResponse {
  title: string;
  description: string;
  keywords: string[];
  improvements?: string[];
  seoTips?: string[];
  marketingHighlights?: string[];
}

@Controller()
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(private readonly aiService: AIService) {}

  @MessagePattern({ cmd: 'generate_optimized_content' })
  async generateOptimizedContent(@Payload() data: GenerateContentDto): Promise<{
    statusCode: number;
    data?: GeneratedContentResponse;
    error?: string;
  }> {
    try {
      this.logger.log('🤖 AI Microservice: Optimized content generation requested');
      this.logger.debug('Received data keys:', Object.keys(data));

      // Validation des champs requis
      if (!data.propertyType || !data.location || !data.userPrompt) {
        this.logger.error('❌ Missing required fields');
        return {
          statusCode: 400,
          error: 'Missing required fields: propertyType, location, and userPrompt are required'
        };
      }

      // Transformation des données pour le service (maintenant plus directe)
      const serviceData = this.transformToServiceFormat(data);
      
      this.logger.debug('Transformed data for service:', Object.keys(serviceData));
      
      // Appel du service AI
      const aiResult = await this.aiService.generateOptimizedContent(serviceData);
      
      // Transformation du résultat pour correspondre à l'interface de réponse
      const transformedResult: GeneratedContentResponse = {
        title: aiResult.title,
        description: aiResult.description,
        keywords: aiResult.suggestions?.keywords || [],
        improvements: aiResult.suggestions?.improvements || [],
        seoTips: aiResult.suggestions?.seoTips || [],
        marketingHighlights: aiResult.suggestions?.marketingHighlights || []
      };
      
      this.logger.log('✅ AI Content generated successfully');
      this.logger.debug('Generated content preview:', {
        titleLength: transformedResult.title.length,
        descriptionLength: transformedResult.description.length,
        keywordsCount: transformedResult.keywords.length
      });
      
      return {
        statusCode: 200,
        data: transformedResult
      };

    } catch (error: any) {
      this.logger.error('❌ Error during AI content generation:', {
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
      
      return {
        statusCode: error.status || 500,
        error: error.message || 'Internal server error during content generation'
      };
    }
  }

  @MessagePattern({ cmd: 'validate_ai_config' })
  async validateAIConfig(@Payload() data: { firebaseUid?: string }): Promise<{ 
    isValid: boolean; 
    message: string;
    provider?: string;
  }> {
    try {
      this.logger.log('🔍 AI Microservice: Validating AI configuration');
      
      const isValid = await this.aiService.validateApiKey();
      
      return {
        isValid,
        provider: 'Google Gemini',
        message: isValid 
          ? 'Gemini AI configuration is valid and ready' 
          : 'Gemini AI configuration is invalid - please check your API key'
      };
    } catch (error: any) {
      this.logger.error('❌ AI validation error:', error.message);
      return {
        isValid: false,
        provider: 'Google Gemini',
        message: 'Error occurred during AI configuration validation'
      };
    }
  }

  @MessagePattern({ cmd: 'get_content_suggestions' })
  async getContentSuggestions(@Payload() data: { 
    propertyType: string; 
    location: string;
    language?: string;
  }): Promise<{
    statusCode: number;
    data?: string[];
    error?: string;
  }> {
    try {
      this.logger.log('💡 AI Microservice: Content suggestions requested');
      this.logger.debug('Request data:', { 
        propertyType: data.propertyType, 
        location: data.location,
        language: data.language 
      });
      
      if (!data.propertyType || !data.location) {
        return {
          statusCode: 400,
          error: 'Property type and location are required'
        };
      }

      const suggestions = this.generateSuggestionsByPropertyType(
        data.propertyType, 
        data.location, 
        data.language
      );
      
      this.logger.log(`✅ Generated ${suggestions.length} suggestions`);

      return {
        statusCode: 200,
        data: suggestions
      };

    } catch (error: any) {
      this.logger.error('❌ Error generating suggestions:', error.message);
      return {
        statusCode: 500,
        data: ['Unable to load suggestions at the moment'],
        error: error.message || 'Error generating content suggestions'
      };
    }
  }

  @MessagePattern({ cmd: 'get_ai_generation_history' })
  async getAIGenerationHistory(@Payload() data: { 
    firebaseUid: string; 
    limit?: number;
    propertyId?: string;
  }): Promise<{
    statusCode: number;
    data?: any[];
    error?: string;
    meta?: { total: number; limit: number; };
  }> {
    try {
      this.logger.log(`📜 AI Microservice: Retrieving AI generation history for user: ${data.firebaseUid}`);
      
      // TODO: Implement actual database storage/retrieval
      // Pour l'instant, retourne un historique vide
      return {
        statusCode: 200,
        data: [],
        meta: {
          total: 0,
          limit: data.limit || 10
        }
      };

    } catch (error: any) {
      this.logger.error('❌ Error retrieving AI history:', error.message);
      return {
        statusCode: 500,
        error: 'Error retrieving AI generation history'
      };
    }
  }

  @MessagePattern({ cmd: 'get_ai_service_status' })
  async getAIServiceStatus(): Promise<{
    statusCode: number;
    data?: {
      status: string;
      provider: string;
      isConfigured: boolean;
      lastCheck?: string;
    };
    error?: string;
  }> {
    try {
      this.logger.log('📊 AI Microservice: Status check requested');
      
      const isConfigured = await this.aiService.validateApiKey();
      
      return {
        statusCode: 200,
        data: {
          status: isConfigured ? 'operational' : 'configuration_error',
          provider: 'Google Gemini',
          isConfigured,
          lastCheck: new Date().toISOString()
        }
      };
    } catch (error: any) {
      this.logger.error('❌ Error checking AI service status:', error.message);
      return {
        statusCode: 500,
        error: 'Error checking AI service status'
      };
    }
  }

  /**
   * Transforme les données du contrôleur vers le format attendu par le service
   */
  private transformToServiceFormat(controllerData: GenerateContentDto): ServiceGenerateContentDto {
    // Gestion des amenities - conversion array vers objet si nécessaire
    let amenitiesObject: ServiceGenerateContentDto['amenities'] = undefined;
    
    if (controllerData.amenities) {
      if (Array.isArray(controllerData.amenities)) {
        // Conversion array vers objet
        amenitiesObject = {};
        controllerData.amenities.forEach(amenity => {
          const amenityKey = amenity.replace(/\s+/g, '_') as keyof NonNullable<ServiceGenerateContentDto['amenities']>;
          if (amenitiesObject) {
            (amenitiesObject as any)[amenityKey] = true;
          }
        });
      } else {
        // Déjà un objet, utilise tel quel
        amenitiesObject = controllerData.amenities as ServiceGenerateContentDto['amenities'];
      }
    }

    // Construction de l'objet de service avec tous les champs
    const serviceData: ServiceGenerateContentDto = {
      // Champs obligatoires
      propertyType: controllerData.propertyType,
      location: controllerData.location,
      userPrompt: controllerData.userPrompt,
      
      // Champs optionnels - copie directe
      title: controllerData.title,
      description: controllerData.description,
      size: controllerData.size,
      floorNumber: controllerData.floorNumber,
      lotSize: controllerData.lotSize,
      rooms: controllerData.rooms,
      bedrooms: controllerData.bedrooms,
      bathrooms: controllerData.bathrooms,
      beds_Number: controllerData.beds_Number,
      numberOfBalconies: controllerData.numberOfBalconies,
      maxGuest: controllerData.maxGuest,
      minNight: controllerData.minNight,
      maxNight: controllerData.maxNight,
      apartmentSpaces: controllerData.apartmentSpaces,
      latitude: controllerData.latitude,
      longitude: controllerData.longitude,
      address: controllerData.address,
      city: controllerData.city,
      country: controllerData.country,
      amenities: amenitiesObject,
      policies: controllerData.policies,
      paymentMethods: controllerData.paymentMethods,
      phone: controllerData.phone,
      email: controllerData.email,
      website: controllerData.website,
      targetAudience: controllerData.targetAudience,
      tone: controllerData.tone,
      language: controllerData.language,
      features: controllerData.features
    };

    // Supprime les propriétés undefined pour éviter la pollution
    Object.keys(serviceData).forEach(key => {
      if ((serviceData as any)[key] === undefined) {
        delete (serviceData as any)[key];
      }
    });

    return serviceData;
  }

  /**
   * Génère des suggestions personnalisées par type de propriété et localisation
   */
  private generateSuggestionsByPropertyType(
    propertyType: string, 
    location: string, 
    language?: string
  ): string[] {
    const suggestions: string[] = [];
    const type = propertyType?.toLowerCase();
    const isArabic = language === 'ar';
    const isFrench = language === 'fr';
    
    // Suggestions spécifiques par type de propriété
    switch (type) {
      case 'villa':
        if (isArabic) {
          suggestions.push(
            'اركز على المساحات الخارجية الواسعة والمسبح الخاص',
            'أكد على الخصوصية والرفاهية',
            'اذكر الحديقة ومناطق تناول الطعام في الهواء الطلق'
          );
        } else if (isFrench) {
          suggestions.push(
            'Mettez en avant les espaces extérieurs spacieux et la piscine privée',
            'Insistez sur l\'intimité et les équipements de luxe',
            'Mentionnez le jardin et les espaces de restauration en plein air'
          );
        } else {
          suggestions.push(
            'Highlight the spacious outdoor areas and private pool',
            'Emphasize privacy and luxury amenities',
            'Mention the garden, landscaping, and outdoor dining areas',
            'Describe parking facilities and security features'
          );
        }
        break;
        
      case 'apartment':
      case 'appartement':
        if (isArabic) {
          suggestions.push(
            'اركز على الموقع المركزي المريح',
            'اذكر القرب من وسائل النقل العام',
            'أكد على وسائل الراحة الحديثة'
          );
        } else if (isFrench) {
          suggestions.push(
            'Mettez en avant l\'emplacement central pratique',
            'Mentionnez la proximité des transports en commun',
            'Insistez sur les équipements modernes'
          );
        } else {
          suggestions.push(
            'Highlight the convenient central location',
            'Mention proximity to public transportation',
            'Emphasize modern amenities and building facilities'
          );
        }
        break;
        
      case 'hotel':
        if (isArabic) {
          suggestions.push(
            'اركز على خدمات الضيافة المهنية',
            'اذكر الإفطار المجاني والتنظيف اليومي',
            'أكد على خدمة الاستقبال على مدار 24 ساعة'
          );
        } else if (isFrench) {
          suggestions.push(
            'Mettez en avant les services d\'accueil professionnels',
            'Mentionnez le petit-déjeuner gratuit et le service de ménage quotidien',
            'Insistez sur la réception 24h/24'
          );
        } else {
          suggestions.push(
            'Highlight professional hospitality services',
            'Mention complimentary breakfast and daily housekeeping',
            'Emphasize 24/7 front desk and concierge services'
          );
        }
        break;
        
      case 'house':
      case 'maison':
        if (isArabic) {
          suggestions.push(
            'اركز على الميزات المناسبة للعائلات والمساحة',
            'اذكر الحي الآمن والشعور بالمجتمع',
            'أكد على مساحات المعيشة الداخلية والخارجية'
          );
        } else if (isFrench) {
          suggestions.push(
            'Mettez en avant les caractéristiques adaptées aux familles',
            'Mentionnez le quartier sûr et l\'esprit communautaire',
            'Insistez sur les espaces de vie intérieurs et extérieurs'
          );
        } else {
          suggestions.push(
            'Highlight family-friendly features and space',
            'Mention the safe neighborhood and community feel',
            'Emphasize indoor and outdoor living spaces'
          );
        }
        break;
        
      default:
        if (isArabic) {
          suggestions.push(
            'صف الطابع والجو الفريد',
            'اركز على وسائل الراحة والميزات الرئيسية',
            'اذكر ما يجعل هذا العقار مميزاً'
          );
        } else if (isFrench) {
          suggestions.push(
            'Décrivez le caractère unique et l\'atmosphère',
            'Mettez en avant les équipements et caractéristiques principales',
            'Mentionnez ce qui rend cette propriété spéciale'
          );
        } else {
          suggestions.push(
            'Describe the unique character and atmosphere',
            'Highlight the main amenities and features',
            'Mention what makes this property special'
          );
        }
    }

    // Suggestions spécifiques à la localisation tunisienne
    const locationLower = location?.toLowerCase() || '';
    
    if (locationLower.includes('tunisia') || locationLower.includes('tunisie') || locationLower.includes('تونس')) {
      if (isArabic) {
        suggestions.push(
          'اذكر التجربة التونسية الأصيلة',
          'اركز على القرب من شواطئ البحر المتوسط',
          'صف الوصول إلى الأسواق المحلية والمواقع الثقافية'
        );
      } else if (isFrench) {
        suggestions.push(
          'Mentionnez l\'expérience tunisienne authentique',
          'Mettez en avant la proximité des plages méditerranéennes',
          'Décrivez l\'accès aux marchés locaux et sites culturels'
        );
      } else {
        suggestions.push(
          'Mention the authentic Tunisian experience',
          'Highlight proximity to Mediterranean beaches',
          'Describe access to local markets and cultural sites'
        );
      }
    }

    // Suggestions générales SEO et marketing
    if (isArabic) {
      suggestions.push(
        'استخدم كلمات مفتاحية خاصة بالموقع',
        'اذكر المعالم السياحية القريبة',
        'صف نوع التجربة التي يمكن للضيوف توقعها'
      );
    } else if (isFrench) {
      suggestions.push(
        'Utilisez des mots-clés spécifiques à la localisation',
        'Mentionnez les attractions et points d\'intérêt à proximité',
        'Décrivez le type d\'expérience que les clients peuvent attendre'
      );
    } else {
      suggestions.push(
        'Use location-specific keywords throughout the description',
        'Mention nearby attractions and points of interest',
        'Describe the type of experience guests can expect',
        'Include details about accessibility and transportation'
      );
    }

    return suggestions.slice(0, 12); // Limite à 12 suggestions maximum
  }
}