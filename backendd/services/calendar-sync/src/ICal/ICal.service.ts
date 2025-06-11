import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Property, PropertyDocument } from '../schema/property.schema';
import { SyncLog, SyncLogDocument } from '../schema/sync-log.schema';
import { Availability, AvailabilityDocument, AvailabilityItem } from '../schema/availability.schema';
import * as ical from 'node-ical';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

interface ICalEvent {
  type: string;
  uid: string;
  start: Date;
  end: Date;
  summary?: string;
  description?: string;
  status?: string;
}

// Remove the local AvailabilityItem interface - use the one from schema
// Keep only the simple version for return types
export interface AvailabilityItemSimple {
  date: string;
  isAvailable: boolean;
}

@Injectable()
export class ICalSyncService {
  private readonly logger = new Logger(ICalSyncService.name);

  constructor(
    private configService: ConfigService,
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocument>,
    @InjectModel(SyncLog.name)
    private syncLogModel: Model<SyncLogDocument>,
    @InjectModel(Availability.name)
    private availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async syncPropertyCalendar(propertyId: string): Promise<{ success: boolean; message?: string; availabilities?: AvailabilityItemSimple[] }> {
    this.logger.log(`🚀 Début synchronisation iCal pour la propriété ${propertyId}`);
    
    try {
      // Validate and find property - handle both ObjectId and custom string IDs
      const property = await this.findPropertyById(propertyId);
      if (!property) {
        throw new Error(`Property with ID ${propertyId} not found`);
      }

      if (!property.icalUrl) {
        throw new Error(`Aucune URL iCal configurée pour la propriété ${propertyId}`);
      }

      // Validation de l'URL iCal
      if (!this.validateICalUrl(property.icalUrl)) {
        throw new Error(`URL iCal invalide: ${property.icalUrl}`);
      }

      // Récupération et parsing des données iCal avec node-ical
      const events = await this.fetchAndParseICalData(property.icalUrl);
      this.logger.log(`📅 ${events.length} événements trouvés dans le calendrier iCal`);

      // Conversion en disponibilités
      const availabilities = this.convertEventsToAvailabilities(events);
      
      // Sauvegarde des disponibilités
      await this.saveAvailabilities(propertyId, availabilities, 'ical', property);

      // Log de synchronisation avec le platform de la propriété
      await this.logSyncOperation(propertyId, 'ical', true, `${availabilities.length} disponibilités synchronisées`, property);

      this.logger.log(`✅ Synchronisation iCal réussie pour la propriété ${propertyId}`);
      
      return {
        success: true,
        message: `Synchronisation réussie: ${availabilities.length} disponibilités mises à jour`,
        availabilities
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur synchronisation iCal pour ${propertyId}: ${error.message}`);
      
      // Récupérer la propriété pour le log même en cas d'erreur
      const property = await this.findPropertyById(propertyId);
      await this.logSyncOperation(propertyId, 'ical', false, error.message, property);
      
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Find property by ID - handles both ObjectId and custom string IDs
   */
  private async findPropertyById(propertyId: string): Promise<PropertyDocument | null> {
    try {
      // First, try to find by MongoDB ObjectId
      if (Types.ObjectId.isValid(propertyId)) {
        return await this.propertyModel.findById(propertyId);
      }
      
      // If not a valid ObjectId, try to find by siteId or other custom field
      return await this.propertyModel.findOne({ 
        $or: [
          { siteId: propertyId },
          { _id: propertyId }, // This will likely fail but let's try
        ]
      });
    } catch (error) {
      this.logger.warn(`⚠️ Error finding property with ID ${propertyId}: ${error.message}`);
      // Fallback to finding by siteId
      return await this.propertyModel.findOne({ siteId: propertyId });
    }
  }

  /**
   * Get the proper ObjectId for a property - handles both ObjectId and custom string IDs
   */
  private getPropertyObjectId(property: PropertyDocument, originalId: string): Types.ObjectId {
    if (property._id && Types.ObjectId.isValid(property._id)) {
      return new Types.ObjectId(property._id);
    }
    
    // If the property doesn't have a valid ObjectId, we need to handle this case
    // This might happen if you're using custom string IDs
    throw new Error(`Property ${originalId} does not have a valid ObjectId`);
  }

  private validateICalUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // Vérifier que c'est HTTPS ou HTTP
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }

      // Vérifier les domaines connus pour iCal
      const knownDomains = [
        'airbnb.com',
        'airbnb.fr', 
        'airbnb.co.uk',
        'booking.com',
        'admin.booking.com',
        'calendar.google.com',
        'outlook.office365.com',
        'calendly.com',
        'vrbo.com',
        'homeaway.com'
      ];

      const hostname = parsedUrl.hostname.toLowerCase();
      const isKnownDomain = knownDomains.some(domain => 
        hostname.includes(domain) || hostname.endsWith(domain)
      );

      // Pour les domaines connus, on vérifie des patterns spécifiques
      if (isKnownDomain) {
        // Airbnb pattern
        if (hostname.includes('airbnb')) {
          return url.includes('/calendar/ical/') || url.includes('.ics');
        }
        
        // Booking.com pattern
        if (hostname.includes('booking')) {
          return url.includes('/calendar') && url.includes('.ics');
        }
      }

      // Pour les autres, vérifier juste que ça finit par .ics ou contient 'ical'
      return url.endsWith('.ics') || url.includes('ical') || url.includes('calendar');
      
    } catch (error) {
      return false;
    }
  }

  private async fetchAndParseICalData(url: string): Promise<ICalEvent[]> {
    try {
      // Méthode 1: Essayer avec fromURL (callback version wrapped in Promise)
      const events = await new Promise<any>((resolve, reject) => {
        ical.fromURL(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CalendarSync/1.0)',
            'Accept': 'text/calendar,text/plain,*/*',
          },
          timeout: 30000
        }, (err: any, data: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      if (!events || typeof events !== 'object') {
        throw new Error('Aucune donnée reçue de node-ical');
      }

      // Convertir l'objet events en tableau et filtrer les événements valides
      const eventArray: ICalEvent[] = Object.values(events)
        .filter((event: any): event is ICalEvent => 
          event &&
          typeof event === 'object' &&
          event.type === 'VEVENT' && 
          event.start && 
          event.end &&
          event.uid
        )
        .map((event: any): ICalEvent => ({
          type: event.type,
          uid: event.uid,
          start: new Date(event.start),
          end: new Date(event.end),
          summary: event.summary || '',
          description: event.description || '',
          status: event.status || ''
        }));

      this.logger.log(`📊 Parsing iCal avec node-ical terminé: ${eventArray.length} événements valides trouvés`);
      return eventArray;

    } catch (error: any) {
      // Fallback: si node-ical échoue, essayer avec notre méthode manuelle + parseICS
      this.logger.warn(`⚠️ node-ical fromURL a échoué, fallback vers méthode manuelle: ${error.message}`);
      
      try {
        const icalData = await this.fetchICalDataManually(url);
        const parsedEvents = ical.parseICS(icalData);
        
        if (!parsedEvents || typeof parsedEvents !== 'object') {
          throw new Error('Échec du parsing iCal avec parseICS');
        }

        const eventArray: ICalEvent[] = Object.values(parsedEvents)
          .filter((event: any): event is ICalEvent => 
            event &&
            typeof event === 'object' &&
            event.type === 'VEVENT' && 
            event.start && 
            event.end &&
            event.uid
          )
          .map((event: any): ICalEvent => ({
            type: event.type,
            uid: event.uid,
            start: new Date(event.start),
            end: new Date(event.end),
            summary: event.summary || '',
            description: event.description || '',
            status: event.status || ''
          }));

        this.logger.log(`📊 Fallback parsing iCal réussi: ${eventArray.length} événements trouvés`);
        return eventArray;

      } catch (fallbackError: any) {
        this.logger.error(`❌ Échec complet du parsing iCal: ${fallbackError.message}`);
        throw new Error(`Impossible de parser le calendrier iCal: ${fallbackError.message}`);
      }
    }
  }

  private async fetchICalDataManually(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CalendarSync/1.0)',
          'Accept': 'text/calendar,text/plain,*/*',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'close'
        },
        timeout: 30000
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        // Gérer les redirections
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this.fetchICalDataManually(res.headers.location).then(resolve).catch(reject);
          return;
        }

        if (!res.statusCode || res.statusCode !== 200) {
          reject(new Error(`HTTP Error: ${res.statusCode || 'Unknown'} ${res.statusMessage || 'Unknown error'}`));
          return;
        }

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (data.trim().length === 0) {
            reject(new Error('Réponse iCal vide'));
            return;
          }

          // Vérifier que c'est bien du contenu iCal
          if (!data.includes('BEGIN:VCALENDAR') || !data.includes('END:VCALENDAR')) {
            reject(new Error('Le contenu récupéré n\'est pas un calendrier iCal valide'));
            return;
          }

          resolve(data);
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Erreur réseau: ${error.message}`));
      });

      req.on('timeout', () => {
        req.abort();
        reject(new Error('Timeout lors de la récupération du calendrier iCal'));
      });

      req.end();
    });
  }

  private convertEventsToAvailabilities(events: ICalEvent[]): AvailabilityItemSimple[] {
    const availabilityMap = new Map<string, boolean>();
    
    // Marquer les dates occupées par les événements
    events.forEach((event: ICalEvent) => {
      try {
        // Les dates sont déjà des objets Date
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        // Vérifier que les dates sont valides
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          this.logger.warn(`⚠️ Dates invalides pour l'événement ${event.uid}: start=${event.start}, end=${event.end}`);
          return;
        }
        
        // Générer toutes les dates entre start et end
        const currentDate = new Date(startDate);
        while (currentDate < endDate) {
          const dateStr = this.formatDate(currentDate);
          availabilityMap.set(dateStr, false); // false = non disponible
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } catch (error: any) {
        this.logger.warn(`⚠️ Erreur traitement événement ${event.uid}: ${error.message}`);
      }
    });

    // Générer les disponibilités pour les 12 prochains mois
    const availabilities: AvailabilityItemSimple[] = [];
    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);

    const currentDate = new Date(today);
    while (currentDate <= endDate) {
      const dateStr = this.formatDate(currentDate);
      const isAvailable = !availabilityMap.has(dateStr); // Si pas dans la map, alors disponible
      
      availabilities.push({
        date: dateStr,
        isAvailable
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const occupiedDates = availabilities.filter(a => !a.isAvailable).length;
    const availableDates = availabilities.length - occupiedDates;
    
    this.logger.log(`📊 Conversion terminée: ${availableDates} jours disponibles, ${occupiedDates} jours occupés sur ${availabilities.length} jours au total`);

    return availabilities;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async saveAvailabilities(
    propertyId: string, 
    availabilityData: AvailabilityItemSimple[], 
    source: string,
    property?: PropertyDocument
  ): Promise<void> {
    this.logger.log(`💾 Sauvegarde de ${availabilityData.length} disponibilités pour la propriété ${propertyId}`);
    
    try {
      const now = new Date();
      
      let propertyDoc: PropertyDocument | null = property || null;
      if (!propertyDoc) {
        propertyDoc = await this.findPropertyById(propertyId);
        if (!propertyDoc) {
          throw new Error(`Property with ID ${propertyId} not found`);
        }
      }
      
      // Convertir les données en format AvailabilityItem pour le schéma (avec lastUpdated)
      const availabilityItems: AvailabilityItem[] = availabilityData.map(item => ({
        date: new Date(item.date),
        isAvailable: item.isAvailable,
        lastUpdated: now
      }));

      // Chercher un document existant pour cette propriété et source
      const existing = await this.availabilityModel.findOne({
        siteId: propertyDoc.siteId,
        source,
      });

      if (existing) {
        // Mettre à jour le document existant
        existing.availabilities = availabilityItems;
        existing.lastUpdated = now;
        existing.updatedAt = now;
        await existing.save();
        
        this.logger.log(`✅ Disponibilités mises à jour pour la propriété ${propertyId}`);
      } else {
        // Créer un nouveau document
        let propertyObjectId: string | null = null;
        
        try {
          if (Types.ObjectId.isValid(propertyId)) {
            propertyObjectId = propertyId;
          } else if (propertyDoc._id && Types.ObjectId.isValid(propertyDoc._id)) {
            propertyObjectId = propertyDoc._id.toString();
          } else {
            // Utiliser siteId si pas d'ObjectId valide
            propertyObjectId = propertyDoc.siteId;
          }
        } catch (error) {
          propertyObjectId = propertyDoc.siteId;
        }

        const availability = new this.availabilityModel({
          propertyId: propertyObjectId,
          siteId: propertyDoc.siteId,
          source,
          availabilities: availabilityItems,
          lastUpdated: now,
          createdAt: now,
          updatedAt: now,
        });
        
        await availability.save();
        this.logger.log(`✅ Nouvelles disponibilités créées pour la propriété ${propertyId}`);
      }
      
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors de la sauvegarde des disponibilités: ${error.message}`);
      throw error;
    }
  }

  private async logSyncOperation(
    propertyId: string,
    syncType: string,
    success: boolean,
    message: string,
    property?: PropertyDocument | null
  ): Promise<void> {
    try {
      let propertyObjectId: Types.ObjectId | null = null;
      let propertyDoc = property;
      
      // Si on n'a pas la propriété, on la récupère
      if (!propertyDoc) {
        propertyDoc = await this.findPropertyById(propertyId);
      }
      
      // Try to get a valid ObjectId
      if (Types.ObjectId.isValid(propertyId)) {
        propertyObjectId = new Types.ObjectId(propertyId);
      } else if (propertyDoc && propertyDoc._id && Types.ObjectId.isValid(propertyDoc._id)) {
        propertyObjectId = new Types.ObjectId(propertyDoc._id);
      }

      const syncLogData: any = {
        platform: propertyDoc?.platform || 'unknown', // Utiliser le platform de la propriété
        status: success ? 'SUCCESS' : 'ERROR',
        message,
        completedAt: new Date(),
        metadata: {
          syncType: syncType,
          sources: ['ical']
        }
      };

      // Only add propertyId if we have a valid ObjectId
      if (propertyObjectId) {
        syncLogData.propertyId = propertyObjectId;
      } else {
        // Alternative: store the original propertyId as a string field
        syncLogData.propertyIdentifier = propertyId;
        this.logger.warn(`⚠️ Storing sync log without ObjectId for property: ${propertyId}`);
      }

      const syncLog = new this.syncLogModel(syncLogData);
      await syncLog.save();
      
      this.logger.log(`📝 Log de synchronisation enregistré pour la propriété ${propertyId} (platform: ${propertyDoc?.platform || 'unknown'})`);
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors de l'enregistrement du log de sync: ${error.message}`);
    }
  }

  async testICalUrl(url: string): Promise<{ 
    valid: boolean; 
    message: string; 
    events?: number;
    eventCount?: number;
    dateRange?: { start: string; end: string };
    details?: {
      reservations: number;
      blocked: number;
      other: number;
      eventTypes: string[];
      platforms: string[];
    }
  }> {
    try {
      if (!this.validateICalUrl(url)) {
        return {
          valid: false,
          message: 'Format d\'URL iCal invalide'
        };
      }

      const events = await this.fetchAndParseICalData(url);

      if (events.length === 0) {
        return {
          valid: true,
          message: 'URL iCal valide mais aucun événement trouvé',
          events: 0,
          eventCount: 0
        };
      }

      // Analyser les événements pour extraire plus d'informations
      let reservationCount = 0;
      let blockedCount = 0;
      let otherCount = 0;
      const eventTypes = new Set<string>();
      const platforms = new Set<string>();
      
      let earliestDate: Date | null = null;
      let latestDate: Date | null = null;

      events.forEach((event: ICalEvent) => {
        // Analyser les types d'événements
        const summary = (event.summary || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        
        if (summary.includes('réservation') || summary.includes('reservation')) {
          reservationCount++;
          eventTypes.add('reservation');
        } else if (summary.includes('blocked') || summary.includes('maintenance')) {
          blockedCount++;
          eventTypes.add('blocked');
        } else {
          otherCount++;
          eventTypes.add('other');
        }

        // Extraire les plateformes depuis la description
        if (description.includes('airbnb')) {
          platforms.add('Airbnb');
        } else if (description.includes('booking')) {
          platforms.add('Booking.com');
        } else if (description.includes('vrbo')) {
          platforms.add('VRBO');
        }

        // Calculer la plage de dates
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        if (!earliestDate || startDate < earliestDate) {
          earliestDate = startDate;
        }
        if (!latestDate || endDate > latestDate) {
          latestDate = endDate;
        }
      });

      const response: any = {
        valid: true,
        message: `Valid iCal URL with ${events.length} events`,
        events: events.length,
        eventCount: events.length
      };

      // Ajouter la plage de dates si on a des événements
      if (earliestDate && latestDate) {
        response.dateRange = {
          start: this.formatDate(earliestDate),
          end: this.formatDate(latestDate)
        };
      }

      // Ajouter les détails d'analyse
      response.details = {
        reservations: reservationCount,
        blocked: blockedCount,
        other: otherCount,
        eventTypes: Array.from(eventTypes),
        platforms: Array.from(platforms)
      };

      this.logger.log(`✅ Test URL iCal réussi: ${events.length} événements (${reservationCount} réservations, ${blockedCount} bloqués)`);
      
      return response;

    } catch (error: any) {
      this.logger.error(`❌ Erreur test URL iCal: ${error.message}`);
      return {
        valid: false,
        message: `Erreur lors du test de l'URL iCal: ${error.message}`
      };
    }
  }

  // Méthode pour synchroniser toutes les propriétés avec iCal
  async syncAllPropertiesWithICal(): Promise<{ total: number; success: number; failed: number }> {
    this.logger.log('🚀 Début synchronisation globale iCal');
    
    const properties = await this.propertyModel.find({ 
      $and: [
        { icalUrl: { $exists: true } },
        { icalUrl: { $ne: null } },
        { icalUrl: { $ne: '' } }
      ]
    });

    let successCount = 0;
    let failedCount = 0;

    for (const property of properties) {
      try {
        // Use the property's _id if it's valid, otherwise use siteId
        const propertyIdentifier = (property._id && Types.ObjectId.isValid(property._id)) 
          ? property._id.toString() 
          : property.siteId;
          
        const result = await this.syncPropertyCalendar(propertyIdentifier);
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error: any) {
        failedCount++;
        this.logger.error(`❌ Erreur sync propriété ${property._id || property.siteId}: ${error.message}`);
      }

      // Petite pause entre les synchronisations pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.logger.log(`✅ Synchronisation globale terminée: ${successCount} succès, ${failedCount} échecs sur ${properties.length} propriétés`);

    return {
      total: properties.length,
      success: successCount,
      failed: failedCount
    };
  }
}