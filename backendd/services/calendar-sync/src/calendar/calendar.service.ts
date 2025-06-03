import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Property, PropertyDocument } from '../schema/property.schema';
import { Availability, AvailabilityDocument } from '../schema/availability.schema';
import { CalendarSubscription, CalendarSubscriptionDocument } from '../schema/calendar-subscription.schema';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto';
//import { CalendarConflictDto } from '../dto/calendar-conflict.dto';

export interface ExportOptions {
  format: 'json' | 'ical' | 'csv' | 'xml';
  startDate?: string;
  endDate?: string;
  includeMetadata?: boolean;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: Array<{
    date: string;
    sources: string[];
    conflictType: 'availability' | 'booking' | 'maintenance';
  }>;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocument>,
    @InjectModel(Availability.name)
    private availabilityModel: Model<AvailabilityDocument>,
    @InjectModel(CalendarSubscription.name)
    private subscriptionModel: Model<CalendarSubscriptionDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createProperty(createPropertyDto: CreatePropertyDto): Promise<PropertyDocument> {
    this.logger.log(`Création d'une nouvelle propriété: ${JSON.stringify(createPropertyDto)}`);
    
    // Valider l'URL publique selon la plateforme
    this.validatePublicUrl(createPropertyDto.publicUrl, createPropertyDto.platform);
    
    // Vérifier si la propriété existe déjà (par URL publique plutôt que siteId)
    const existingProperty = await this.propertyModel.findOne({
      publicUrl: createPropertyDto.publicUrl,
      platform: createPropertyDto.platform,
    });
    
    if (existingProperty) {
      this.logger.log(`La propriété existe déjà avec l'ID: ${existingProperty._id}`);
      return existingProperty;
    }
    
    // Extraire le siteId depuis l'URL publique
    const siteId = this.extractSiteIdFromUrl(createPropertyDto.publicUrl, createPropertyDto.platform);
    
    // Créer une nouvelle propriété
    const property = new this.propertyModel({
      ...createPropertyDto,
      siteId, // Auto-généré depuis l'URL
    });
    
    const savedProperty = await property.save();
    this.logger.log(`Propriété créée avec l'ID: ${savedProperty._id}`);
    
    // Émettre un événement pour la création de propriété
    this.eventEmitter.emit('property.created', { property: savedProperty });
    
    return savedProperty;
  }

  /**
   * Valide l'URL publique selon la plateforme
   */
  private validatePublicUrl(publicUrl: string, platform: string): void {
    const urlPatterns = {
      airbnb: /^https:\/\/(www\.)?airbnb\.(com|fr|co\.uk|ca|com\.au)\/rooms\/\d+/,
      booking: /^https:\/\/(www\.)?booking\.com\/hotel\/.+\.html/,
      vrbo: /^https:\/\/(www\.)?vrbo\.com\/\d+/,
      homeaway: /^https:\/\/(www\.)?homeaway\.(com|fr|co\.uk)\/vacation-rental\/p\d+/,
    };

    const pattern = urlPatterns[platform.toLowerCase()];
    if (!pattern || !pattern.test(publicUrl)) {
      throw new Error(`URL publique invalide pour la plateforme ${platform}. Format attendu: ${this.getUrlFormatExample(platform)}`);
    }
  }

  /**
   * Retourne un exemple de format d'URL pour chaque plateforme
   */
  private getUrlFormatExample(platform: string): string {
    const examples = {
      airbnb: 'https://www.airbnb.com/rooms/12345678',
      booking: 'https://www.booking.com/hotel/fr/nom-de-lhotel.html',
      vrbo: 'https://www.vrbo.com/12345678',
      homeaway: 'https://www.homeaway.com/vacation-rental/p123456',
    };
    
    return examples[platform.toLowerCase()] || 'Format non reconnu';
  }

  /**
   * Extrait le siteId depuis l'URL publique
   */
  private extractSiteIdFromUrl(publicUrl: string, platform: string): string {
    switch (platform.toLowerCase()) {
      case 'airbnb':
        const airbnbMatch = publicUrl.match(/\/rooms\/(\d+)/);
        return airbnbMatch ? airbnbMatch[1] : '';
        
      case 'booking':
        const bookingMatch = publicUrl.match(/\/hotel\/[^\/]+\/([^\.]+)\.html/);
        return bookingMatch ? bookingMatch[1] : publicUrl.split('/').pop()?.replace('.html', '') || '';
        
      case 'vrbo':
        const vrboMatch = publicUrl.match(/\/(\d+)/);
        return vrboMatch ? vrboMatch[1] : '';
        
      case 'homeaway':
        const homeawayMatch = publicUrl.match(/\/p(\d+)/);
        return homeawayMatch ? homeawayMatch[1] : '';
        
      default:
        throw new Error(`Plateforme non supportée: ${platform}`);
    }
  }

  async findAllProperties(): Promise<PropertyDocument[]> {
    this.logger.log('Récupération de toutes les propriétés');
    return this.propertyModel.find().exec();
  }

  async findPropertyById(id: string): Promise<PropertyDocument> {
    this.logger.log(`Recherche de la propriété avec l'ID: ${id}`);
    
    const property = await this.propertyModel.findById(id).exec();
    
    if (!property) {
      throw new NotFoundException(`Propriété avec l'ID ${id} non trouvée`);
    }
    
    return property;
  }

  async updateAvailability(updateAvailabilityDto: UpdateAvailabilityDto): Promise<AvailabilityDocument> {
    this.logger.log(`Mise à jour de la disponibilité pour la propriété ${updateAvailabilityDto.propertyId} à la date ${updateAvailabilityDto.date}`);
    
    // Vérifier si la propriété existe
    await this.findPropertyById(updateAvailabilityDto.propertyId);
    
    // Utiliser upsert pour créer ou mettre à jour la disponibilité
    const availability = await this.availabilityModel.findOneAndUpdate(
      {
        propertyId: updateAvailabilityDto.propertyId,
        date: new Date(updateAvailabilityDto.date),
        source: updateAvailabilityDto.source,
      },
      {
        $set: {
          isAvailable: updateAvailabilityDto.isAvailable,
          lastUpdated: new Date(),
        },
        $setOnInsert: {
          propertyId: updateAvailabilityDto.propertyId,
          date: new Date(updateAvailabilityDto.date),
          source: updateAvailabilityDto.source,
        }
      },
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    ).exec();

    // Émettre un événement pour la mise à jour de disponibilité
    this.eventEmitter.emit('availability.updated', { 
      availability, 
      propertyId: updateAvailabilityDto.propertyId 
    });
    
    return availability;
  }

  /**
   * Détecte les conflits dans le calendrier d'une propriété
   */
  async detectConflicts(propertyId: string, startDate: string, endDate: string): Promise<ConflictDetectionResult> {
    this.logger.log(`Détection des conflits pour la propriété ${propertyId} du ${startDate} au ${endDate}`);
    
    const availabilities = await this.availabilityModel.find({
      propertyId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ date: 1 }).exec();

    const conflictMap = new Map<string, string[]>();
    
    // Grouper par date pour détecter les conflits
    availabilities.forEach(avail => {
      const dateKey = avail.date.toISOString().split('T')[0];
      if (!conflictMap.has(dateKey)) {
        conflictMap.set(dateKey, []);
      }
      conflictMap.get(dateKey)?.push(avail.source);
    });

    const conflicts = Array.from(conflictMap.entries())
      .filter(([_, sources]) => sources.length > 1)
      .map(([date, sources]) => ({
        date,
        sources,
        conflictType: 'availability' as const,
      }));

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Exporte les données du calendrier dans différents formats
   */
  async exportCalendarData(propertyId: string, options: ExportOptions = { format: 'json' }): Promise<any> {
    this.logger.log(`Exportation des données du calendrier pour la propriété ${propertyId} au format ${options.format}`);
    
    const property = await this.findPropertyById(propertyId);
    
    let query: any = { propertyId };
    if (options.startDate || options.endDate) {
      query.date = {};
      if (options.startDate) query.date.$gte = new Date(options.startDate);
      if (options.endDate) query.date.$lte = new Date(options.endDate);
    }
    
    const availabilities = await this.availabilityModel.find(query).sort({ date: 1 }).exec();
    
    switch (options.format) {
      case 'ical':
        return this.generateICalendar(property, availabilities);
      case 'csv':
        return this.generateCSV(property, availabilities, options.includeMetadata);
      case 'xml':
        return this.generateXML(property, availabilities, options.includeMetadata);
      default:
        return {
          property,
          availabilities,
          scrapingInfo: options.includeMetadata ? {
            publicUrl: property.publicUrl,
            platform: property.platform,
            lastScraped: property.lastSynced,
            exportedAt: new Date(),
            totalRecords: availabilities.length,
          } : undefined,
        };
    }
  }

  private generateICalendar(property: PropertyDocument, availabilities: AvailabilityDocument[]): string {
    let icalData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Calendar-Sync-Service//EN',
      `X-WR-CALNAME:${property.siteId} - ${property.platform}`,
      `X-WR-CALDESC:Calendrier scrapé depuis ${property.publicUrl}`,
      'X-WR-TIMEZONE:Europe/Paris',
    ];
    
    availabilities
      .filter(avail => !avail.isAvailable)
      .forEach(avail => {
        const dateStr = avail.date.toISOString().split('T')[0].replace(/-/g, '');
        const endDate = new Date(avail.date);
        endDate.setDate(endDate.getDate() + 1);
        const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
        const nowTimestamp = new Date().toISOString().replace(/[-:.]/g, '').split('T').join('T') + 'Z';
        
        icalData = icalData.concat([
          'BEGIN:VEVENT',
          `UID:${property._id}-${dateStr}@calendar-sync-service`,
          `DTSTAMP:${nowTimestamp}`,
          `DTSTART;VALUE=DATE:${dateStr}`,
          `DTEND;VALUE=DATE:${endDateStr}`,
          `SUMMARY:Non disponible - ${property.platform}`,
          `DESCRIPTION:Propriété non disponible (Source: ${avail.source} - URL: ${property.publicUrl})`,
          `CATEGORIES:UNAVAILABLE,${property.platform.toUpperCase()}`,
          'END:VEVENT',
        ]);
      });
    
    icalData.push('END:VCALENDAR');
    return icalData.join('\r\n');
  }

  private generateCSV(property: PropertyDocument, availabilities: AvailabilityDocument[], includeMetadata: boolean = false): string {
    const headers = ['Date', 'Available', 'Source', 'Last Updated'];
    if (includeMetadata) {
      headers.push('Property ID', 'Platform', 'Site ID');
    }
    
    const rows = [headers.join(',')];
    
    availabilities.forEach(avail => {
      const row = [
        avail.date.toISOString().split('T')[0],
        avail.isAvailable ? 'Yes' : 'No',
        avail.source,
        avail.lastUpdated?.toISOString() || '',
      ];
      
      if (includeMetadata) {
        row.push(property._id.toString(), property.platform, property.siteId);
      }
      
      rows.push(row.join(','));
    });
    
    return rows.join('\n');
  }

  private generateXML(property: PropertyDocument, availabilities: AvailabilityDocument[], includeMetadata: boolean = false): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<calendar>\n';
    
    if (includeMetadata) {
      xml += `  <property id="${property._id}" platform="${property.platform}" siteId="${property.siteId}">\n`;
      xml += `    <publicUrl>${property.publicUrl}</publicUrl>\n`;
      xml += `    <lastSynced>${property.lastSynced || ''}</lastSynced>\n`;
      xml += `  </property>\n`;
    }
    
    xml += '  <availabilities>\n';
    
    availabilities.forEach(avail => {
      xml += `    <availability>\n`;
      xml += `      <date>${avail.date.toISOString().split('T')[0]}</date>\n`;
      xml += `      <isAvailable>${avail.isAvailable}</isAvailable>\n`;
      xml += `      <source>${avail.source}</source>\n`;
      xml += `      <lastUpdated>${avail.lastUpdated?.toISOString() || ''}</lastUpdated>\n`;
      xml += `    </availability>\n`;
    });
    
    xml += '  </availabilities>\n</calendar>';
    return xml;
  }

  /**
   * Crée un abonnement au calendrier pour les webhooks
   */
  async createCalendarSubscription(propertyId: string, webhookUrl: string, events: string[] = ['availability.updated']): Promise<CalendarSubscriptionDocument> {
    this.logger.log(`Création d'un abonnement calendrier pour la propriété ${propertyId}`);
    
    await this.findPropertyById(propertyId); // Vérifier que la propriété existe
    
    const subscription = new this.subscriptionModel({
      propertyId,
      webhookUrl,
      events,
      isActive: true,
      createdAt: new Date(),
    });
    
    return subscription.save();
  }

  /**
   * Supprime un abonnement au calendrier
   */
  async deleteCalendarSubscription(subscriptionId: string): Promise<void> {
    const result = await this.subscriptionModel.findByIdAndDelete(subscriptionId).exec();
    if (!result) {
      throw new NotFoundException(`Abonnement avec l'ID ${subscriptionId} non trouvé`);
    }
  }

  /**
   * Génère une URL d'abonnement pour un calendrier iCal
   */
  async generateSubscriptionUrl(propertyId: string): Promise<string> {
    await this.findPropertyById(propertyId); // Vérifier que la propriété existe
    
    // Générer un token sécurisé pour l'accès au calendrier
    const token = Buffer.from(`${propertyId}-${Date.now()}`).toString('base64url');
    
    // Dans un vrai environnement, vous stockeriez ce token de manière sécurisée
    return `https://your-domain.com/api/calendar/subscribe/${propertyId}?token=${token}`;
  }

  /**
   * Teste la validité d'une URL publique
   */
  async testPublicUrl(publicUrl: string, platform: string): Promise<{ valid: boolean; message: string }> {
    try {
      this.validatePublicUrl(publicUrl, platform);
      
      return { 
        valid: true, 
        message: `URL valide pour ${platform}. SiteId extrait: ${this.extractSiteIdFromUrl(publicUrl, platform)}` 
      };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }

  /**
   * Nettoie les anciennes données de disponibilité
   */
  async cleanupOldAvailability(olderThanDays: number = 365): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await this.availabilityModel.deleteMany({
      date: { $lt: cutoffDate }
    }).exec();
    
    this.logger.log(`Nettoyage: ${result.deletedCount} enregistrements de disponibilité supprimés`);
    
    return { deletedCount: result.deletedCount };
  }

  /**
   * Obtient des statistiques sur les calendriers
   */
  async getCalendarStats(propertyId?: string): Promise<any> {
    const match = propertyId ? { propertyId } : {};
    
    const stats = await this.availabilityModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          availableDays: { $sum: { $cond: ['$isAvailable', 1, 0] } },
          unavailableDays: { $sum: { $cond: ['$isAvailable', 0, 1] } },
          sourcesCount: { $addToSet: '$source' },
          oldestDate: { $min: '$date' },
          newestDate: { $max: '$date' },
        }
      }
    ]).exec();

    return stats[0] ? {
      ...stats[0],
      sourcesCount: stats[0].sourcesCount.length,
      sources: stats[0].sourcesCount,
    } : {
      totalRecords: 0,
      availableDays: 0,
      unavailableDays: 0,
      sourcesCount: 0,
      sources: [],
      oldestDate: null,
      newestDate: null,
    };
  }
}