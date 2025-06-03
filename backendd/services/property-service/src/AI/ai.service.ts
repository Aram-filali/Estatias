// src/services/ai.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface GenerateContentDto {
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
  
  // Amenities
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
  };
  
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
}

export interface GeneratedContent {
  title: string;
  description: string;
  suggestions: {
    keywords: string[];
    improvements: string[];
    seoTips: string[];
    marketingHighlights: string[];
  };
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly geminiApiUrl: string;
  private readonly geminiApiKey: string | undefined;

  constructor(private configService: ConfigService) {
    this.geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required for AI service to function');
    }
    
    this.logger.log('✅ AI Service initialized with Gemini API');
  }

  async generateOptimizedContent(data: GenerateContentDto): Promise<GeneratedContent> {
    this.logger.log('🚀 AI Service: Starting Gemini content generation...');
    this.logger.debug('Input data keys:', Object.keys(data));
    
    try {
      const prompt = this.buildComprehensivePrompt(data);
      this.logger.debug('Generated prompt length:', prompt.length);
      
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 0.9,
          maxOutputTokens: 2000,
          candidateCount: 1,
          stopSequences: []
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      };

      const response = await axios.post(
        `${this.geminiApiUrl}?key=${this.geminiApiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PropertyAI/2.0'
          },
          timeout: 30000,
          validateStatus: (status) => status >= 200 && status < 300
        }
      );

      this.logger.log('✅ Received Gemini response');
      
      if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new BadRequestException('Invalid response structure from Gemini API');
      }

      const generatedText = response.data.candidates[0].content.parts[0].text;
      return this.parseAIResponse(generatedText);

    } catch (error: any) {
      this.logger.error('❌ Gemini API error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      if (error.response?.status === 400) {
        throw new BadRequestException(`Invalid request to Gemini API: ${error.response.data?.error?.message || error.message}`);
      } else if (error.response?.status === 401) {
        throw new BadRequestException('Invalid Gemini API key');
      } else if (error.response?.status === 429) {
        throw new BadRequestException('Gemini API rate limit exceeded. Please try again later.');
      } else {
        throw new BadRequestException('Failed to generate content with Gemini API');
      }
    }
  }

  private buildComprehensivePrompt(data: GenerateContentDto): string {
    const propertyDetails = this.buildPropertyDetailsSection(data);
    const amenitiesSection = this.buildAmenitiesSection(data);
    const spacesSection = this.buildSpacesSection(data);
    const policiesSection = this.buildPoliciesSection(data);
    const locationContext = this.buildLocationContext(data);

    return `Create comprehensive and engaging marketing content for a ${data.propertyType} rental property.

${propertyDetails}

${locationContext}

${amenitiesSection}

${spacesSection}

${policiesSection}

OWNER'S SPECIFIC REQUEST: ${data.userPrompt}

CONTENT REQUIREMENTS:
- Target Audience: ${data.targetAudience || 'international travelers and local guests'}
- Tone: ${data.tone || 'professional, welcoming, and compelling'}
- Language: ${data.language || 'English'}
- Features to highlight: ${data.features?.join(', ') || 'unique property characteristics'}

INSTRUCTIONS:
Create compelling marketing content that:
1. Captures attention with a memorable title incorporating the location
2. Writes an engaging 280-350 word description that tells a story and creates desire
3. Highlights unique selling points based on actual property features
4. Appeals specifically to the target audience
5. Incorporates location advantages and local attractions
6. Mentions key amenities naturally within the narrative
7. Creates urgency and desire to book
8. Uses persuasive language that converts browsers to bookers

CRITICAL: Respond ONLY with valid JSON in this exact format:
{
  "title": "Compelling property title with location (50-65 characters)",
  "description": "Engaging 280-350 word description that tells a story and highlights key features",
  "keywords": ["location-based-keyword", "property-type-keyword", "amenity-keyword", "target-audience-keyword", "booking-keyword", "experience-keyword", "feature-keyword"],
  "improvements": ["specific improvement suggestion 1", "specific improvement suggestion 2", "specific improvement suggestion 3", "specific improvement suggestion 4"],
  "seoTips": ["actionable SEO tip 1", "actionable SEO tip 2", "actionable SEO tip 3"],
  "marketingHighlights": ["marketing highlight 1", "marketing highlight 2", "marketing highlight 3", "marketing highlight 4"]
}`;
  }

  private buildPropertyDetailsSection(data: GenerateContentDto): string {
    let details = `PROPERTY SPECIFICATIONS:
- Type: ${data.propertyType}
- Location: ${data.location}`;

    if (data.size) details += `\n- Size: ${data.size}m²`;
    if (data.rooms) details += `\n- Total Rooms: ${data.rooms}`;
    if (data.bedrooms) details += `\n- Bedrooms: ${data.bedrooms}`;
    if (data.bathrooms) details += `\n- Bathrooms: ${data.bathrooms}`;
    if (data.beds_Number) details += `\n- Beds: ${data.beds_Number}`;
    if (data.numberOfBalconies) details += `\n- Balconies: ${data.numberOfBalconies}`;
    if (data.maxGuest) details += `\n- Maximum Guests: ${data.maxGuest}`;
    if (data.minNight && data.maxNight) details += `\n- Stay Duration: ${data.minNight}-${data.maxNight} nights`;
    if (data.floorNumber) details += `\n- Floor: ${data.floorNumber}`;
    if (data.lotSize) details += `\n- Land Area: ${data.lotSize}m²`;

    return details;
  }

  private buildLocationContext(data: GenerateContentDto): string {
    let context = `LOCATION & SETTING:
- Primary Location: ${data.location}`;
    
    if (data.address) context += `\n- Full Address: ${data.address}`;
    if (data.city) context += `\n- City: ${data.city}`;
    if (data.country) context += `\n- Country: ${data.country}`;
    if (data.latitude && data.longitude) context += `\n- Coordinates: ${data.latitude}, ${data.longitude}`;
    
    return context;
  }

  private buildAmenitiesSection(data: GenerateContentDto): string {
    if (!data.amenities) return 'AMENITIES: Not specified';

    const amenitiesArray = Object.entries(data.amenities)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key.replace(/_/g, ' '));

    if (amenitiesArray.length === 0) return 'AMENITIES: Basic amenities available';

    return `AMENITIES & FEATURES:
${amenitiesArray.map(amenity => `- ${amenity}`).join('\n')}`;
  }

  private buildSpacesSection(data: GenerateContentDto): string {
    if (!data.apartmentSpaces || data.apartmentSpaces.length === 0) {
      return 'PROPERTY LAYOUT: Standard layout (details not specified)';
    }

    let spacesText = `PROPERTY LAYOUT & SPACES:`;
    data.apartmentSpaces.forEach((space, index) => {
      spacesText += `\n- ${space.type}: ${space.area}m²`;
    });

    return spacesText;
  }

  private buildPoliciesSection(data: GenerateContentDto): string {
    if (!data.policies) return 'POLICIES: Standard rental policies apply';

    let policies = `HOUSE RULES & POLICIES:`;
    
    if (data.policies.check_in_start && data.policies.check_in_end) {
      policies += `\n- Check-in: ${data.policies.check_in_start} - ${data.policies.check_in_end}`;
    }
    if (data.policies.check_out_start && data.policies.check_out_end) {
      policies += `\n- Check-out: ${data.policies.check_out_start} - ${data.policies.check_out_end}`;
    }
    if (data.policies.cancellation_policy) {
      policies += `\n- Cancellation Policy: ${data.policies.cancellation_policy}`;
    }
    if (data.policies.quiet_hours_start && data.policies.quiet_hours_end) {
      policies += `\n- Quiet Hours: ${data.policies.quiet_hours_start} - ${data.policies.quiet_hours_end}`;
    }
    
    const permissions: string[] = [];
    if (data.policies.smoking) permissions.push('smoking allowed');
    if (data.policies.pets) permissions.push('pet-friendly');
    if (data.policies.parties_or_events) permissions.push('events allowed');
    if (data.policies.guests_allowed) permissions.push('additional guests welcome');
    
    if (permissions.length > 0) {
      policies += `\n- Special Permissions: ${permissions.join(', ')}`;
    }

    return policies;
  }

  private parseAIResponse(aiResponse: string): GeneratedContent {
    this.logger.log('🔄 Parsing Gemini response...');
    
    try {
      let cleanedResponse = aiResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Find JSON content if mixed with other text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      const jsonContent = JSON.parse(cleanedResponse);
      
      // Validate required fields
      if (!jsonContent.title || !jsonContent.description) {
        throw new Error('Missing required fields: title and description');
      }

      const result: GeneratedContent = {
        title: this.validateTitle(jsonContent.title),
        description: this.validateDescription(jsonContent.description),
        suggestions: {
          keywords: this.validateArray(jsonContent.keywords, 'keywords', 7),
          improvements: this.validateArray(jsonContent.improvements, 'improvements', 4),
          seoTips: this.validateArray(jsonContent.seoTips, 'seoTips', 3),
          marketingHighlights: this.validateArray(jsonContent.marketingHighlights, 'marketingHighlights', 4)
        }
      };

      this.logger.log('✅ Successfully parsed Gemini content');
      this.logger.debug('Generated content preview:', {
        titleLength: result.title.length,
        descriptionLength: result.description.length,
        keywordsCount: result.suggestions.keywords.length
      });
      
      return result;

    } catch (error: any) {
      this.logger.error('❌ Failed to parse Gemini response:', {
        error: error.message,
        response: aiResponse.substring(0, 200) + '...'
      });
      throw new BadRequestException(`Failed to parse AI response: ${error.message}`);
    }
  }

  private validateTitle(title: string): string {
    if (!title || typeof title !== 'string') {
      throw new Error('Invalid title format');
    }
    
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 10) {
      throw new Error('Title too short (minimum 10 characters)');
    }
    
    return trimmedTitle.substring(0, 65);
  }

  private validateDescription(description: string): string {
    if (!description || typeof description !== 'string') {
      throw new Error('Invalid description format');
    }
    
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 100) {
      throw new Error('Description too short (minimum 100 characters)');
    }
    
    return trimmedDescription;
  }

  private validateArray(array: any, fieldName: string, expectedLength: number): string[] {
    if (!Array.isArray(array)) {
      throw new Error(`Invalid ${fieldName} format - expected array`);
    }
    
    const validItems = array
      .filter(item => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim())
      .slice(0, expectedLength);
    
    if (validItems.length === 0) {
      throw new Error(`No valid ${fieldName} provided`);
    }
    
    return validItems;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      this.logger.log('🔍 Validating Gemini API configuration...');
      
      const response = await axios.post(
        `${this.geminiApiUrl}?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{ text: 'Test validation' }]
          }],
          generationConfig: { 
            maxOutputTokens: 10,
            temperature: 0.1
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      
      const isValid = response.status === 200 && response.data.candidates;
      this.logger.log(isValid ? '✅ Gemini API validation successful' : '❌ Gemini API validation failed');
      return isValid;
      
    } catch (error: any) {
      this.logger.error('❌ Gemini API validation failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data?.error?.message
      });
      return false;
    }
  }
}