import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ScraperService } from './scraper.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property, PropertyDocument } from '../schema/property.schema';
import { SyncLog, SyncLogDocument } from '../schema/sync-log.schema';
import { Availability, AvailabilityDocument } from '../schema/availability.schema';

// DTOs pour les message patterns
interface ScrapeCalendarDto {
  propertyId: string;
}

interface ScrapeCalendarResponse {
  success: boolean;
  propertyId: string;
  platform: string;
  message: string;
  availabilities?: Array<{
    date: string;
    isAvailable: boolean;
  }>;
  error?: string;
}

interface GetSyncLogsDto {
  propertyId?: string;
  platform?: string;
  status?: 'STARTED' | 'SUCCESS' | 'ERROR' | 'CRITICAL_ERROR';
  limit?: number;
  offset?: number;
}

interface GetAvailabilitiesDto {
  propertyId: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
}

interface BulkScrapeDto {
  propertyIds: string[];
  concurrent?: boolean;
  maxConcurrency?: number;
}

@Controller()
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(
    private readonly scraperService: ScraperService,
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocument>,
    @InjectModel(SyncLog.name)
    private syncLogModel: Model<SyncLogDocument>,
    @InjectModel(Availability.name)
    private availabilityModel: Model<AvailabilityDocument>,
  ) {}

  @MessagePattern('scraper.calendar.scrape')
  async scrapeCalendar(@Payload() data: ScrapeCalendarDto): Promise<ScrapeCalendarResponse> {
    this.logger.log(`Réception de la demande de scraping pour la propriété: ${data.propertyId}`);

    try {
      // Récupérer la propriété
      const property = await this.propertyModel.findById(data.propertyId);
      if (!property) {
        return {
          success: false,
          propertyId: data.propertyId,
          platform: 'unknown',
          message: 'Propriété non trouvée',
          error: `Aucune propriété trouvée avec l'ID: ${data.propertyId}`,
        };
      }

      // Effectuer le scraping
      const result = await this.scraperService.scrapeCalendar(property);

      return {
        success: result.success,
        propertyId: data.propertyId,
        platform: property.platform,
        message: result.success 
          ? `Scraping réussi pour ${result.availabilities?.length || 0} dates`
          : 'Échec du scraping',
        availabilities: result.availabilities,
      };

    } catch (error) {
      this.logger.error(`Erreur lors du scraping de la propriété ${data.propertyId}: ${error.message}`);
      
      return {
        success: false,
        propertyId: data.propertyId,
        platform: 'unknown',
        message: 'Erreur lors du scraping',
        error: error.message,
      };
    }
  }

  @MessagePattern('scraper.calendar.bulk-scrape')
  async bulkScrapeCalendars(@Payload() data: BulkScrapeDto): Promise<ScrapeCalendarResponse[]> {
    this.logger.log(`Réception de la demande de scraping en lot pour ${data.propertyIds.length} propriétés`);

    const results: ScrapeCalendarResponse[] = [];
    const concurrent = data.concurrent || false;
    const maxConcurrency = data.maxConcurrency || 3;

    try {
      if (concurrent) {
        // Scraping concurrent avec limite
        const chunks = this.chunkArray(data.propertyIds, maxConcurrency);
        
        for (const chunk of chunks) {
          const promises = chunk.map(propertyId => 
            this.scrapeCalendar({ propertyId }).catch(error => ({
              success: false,
              propertyId,
              platform: 'unknown',
              message: 'Erreur lors du scraping concurrent',
              error: error.message,
            }))
          );
          
          const chunkResults = await Promise.all(promises);
          results.push(...chunkResults);
        }
      } else {
        // Scraping séquentiel
        for (const propertyId of data.propertyIds) {
          try {
            const result = await this.scrapeCalendar({ propertyId });
            results.push(result);
          } catch (error) {
            results.push({
              success: false,
              propertyId,
              platform: 'unknown',
              message: 'Erreur lors du scraping séquentiel',
              error: error.message,
            });
          }
        }
      }

      return results;

    } catch (error) {
      this.logger.error(`Erreur lors du scraping en lot: ${error.message}`);
      throw error;
    }
  }

  @MessagePattern('scraper.sync-logs.get')
  async getSyncLogs(@Payload() data: GetSyncLogsDto) {
    this.logger.log('Réception de la demande de récupération des logs de synchronisation');

    try {
      const query: any = {};
      
      if (data.propertyId) {
        query.propertyId = data.propertyId;
      }
      
      if (data.platform) {
        query.platform = { $regex: new RegExp(data.platform, 'i') };
      }
      
      if (data.status) {
        query.status = data.status;
      }

      const limit = data.limit || 50;
      const offset = data.offset || 0;

      const logs = await this.syncLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate('propertyId', 'siteId platform publicUrl')
        .exec();

      const total = await this.syncLogModel.countDocuments(query);

      return {
        success: true,
        data: logs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + logs.length < total,
        },
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des logs: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @MessagePattern('scraper.availabilities.get')
  async getAvailabilities(@Payload() data: GetAvailabilitiesDto) {
    this.logger.log(`Réception de la demande de récupération des disponibilités pour la propriété: ${data.propertyId}`);

    try {
      const query: any = { propertyId: data.propertyId };

      if (data.dateFrom) {
        query.date = { $gte: data.dateFrom };
      }

      if (data.dateTo) {
        if (query.date) {
          query.date.$lte = data.dateTo;
        } else {
          query.date = { $lte: data.dateTo };
        }
      }

      if (data.source) {
        query.source = data.source;
      }

      const availabilities = await this.availabilityModel
        .find(query)
        .sort({ date: 1 })
        .exec();

      return {
        success: true,
        propertyId: data.propertyId,
        data: availabilities,
        count: availabilities.length,
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la récupération des disponibilités: ${error.message}`);
      return {
        success: false,
        propertyId: data.propertyId,
        error: error.message,
      };
    }
  }

  @MessagePattern('scraper.property.status')
  async getPropertyScrapingStatus(@Payload() data: { propertyId: string }) {
    this.logger.log(`Réception de la demande de statut de scraping pour la propriété: ${data.propertyId}`);

    try {
      const property = await this.propertyModel.findById(data.propertyId);
      if (!property) {
        return {
          success: false,
          error: 'Propriété non trouvée',
        };
      }

      // Récupérer le dernier log de synchronisation
      const lastSyncLog = await this.syncLogModel
        .findOne({ propertyId: data.propertyId })
        .sort({ createdAt: -1 });

      // Compter les disponibilités
      const availabilityCount = await this.availabilityModel.countDocuments({
        propertyId: data.propertyId,
      });

      // Récupérer les disponibilités récentes
      const recentAvailabilities = await this.availabilityModel
        .find({ propertyId: data.propertyId })
        .sort({ lastUpdated: -1 })
        .limit(5);

      return {
        success: true,
        property: {
          id: property._id,
          siteId: property.siteId,
          platform: property.platform,
          lastSynced: property.lastSynced,
          publicUrl: property.publicUrl,
        },
        lastSyncLog,
        statistics: {
          totalAvailabilities: availabilityCount,
          recentAvailabilities,
        },
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du statut: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @MessagePattern('scraper.calendar.schedule')
  async scheduleCalendarScraping(@Payload() data: { 
    propertyId: string; 
    scheduleTime?: string; 
    recurring?: boolean;
    interval?: 'daily' | 'weekly' | 'monthly';
  }) {
    this.logger.log(`Réception de la demande de planification de scraping pour la propriété: ${data.propertyId}`);

    try {
      // Cette méthode pourrait être intégrée avec un système de job queue comme Bull
      // Pour l'instant, on retourne une réponse basique
      
      const property = await this.propertyModel.findById(data.propertyId);
      if (!property) {
        return {
          success: false,
          error: 'Propriété non trouvée',
        };
      }

      // Ici, vous pourriez ajouter la logique pour planifier le job
      // Par exemple, avec Bull Queue ou un autre système de planification

      return {
        success: true,
        message: 'Scraping planifié avec succès',
        propertyId: data.propertyId,
        schedule: {
          scheduleTime: data.scheduleTime || 'immediate',
          recurring: data.recurring || false,
          interval: data.interval || 'daily',
        },
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la planification: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @MessagePattern('scraper.health.check')
  async healthCheck() {
    try {
      // Vérifier la santé du service de scraping
      const totalProperties = await this.propertyModel.countDocuments();
      const recentLogs = await this.syncLogModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Dernières 24h
      });
      const successfulSyncs = await this.syncLogModel.countDocuments({
        status: 'SUCCESS',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      return {
        success: true,
        status: 'healthy',
        statistics: {
          totalProperties,
          recentSyncs: recentLogs,
          successfulSyncs,
          successRate: recentLogs > 0 ? Math.round((successfulSyncs / recentLogs) * 100) : 0,
        },
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Erreur lors du health check: ${error.message}`);
      return {
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  // Méthode utilitaire pour diviser un tableau en chunks
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

@MessagePattern('scraper.test.direct')
async testScrapingDirect(@Payload() data: { 
  url: string; 
  platform: string; 
  testMode?: boolean 
}): Promise<ScrapeCalendarResponse> {
  this.logger.log(`Réception de la demande de test direct pour l'URL: ${data.url}`);

  try {
    // Créer une propriété temporaire pour le test
    const tempProperty = {
      _id: 'test',
      siteId: 'unkown',
      platform: data.platform,
      publicUrl: data.url,
      lastSynced: null,
      save: async () => Promise.resolve(),
    } as any;

    // Effectuer le scraping de test
    const result = await this.scraperService.scrapeCalendar(tempProperty);

    return {
      success: result.success,
      propertyId: 'temp-test',
      platform: data.platform,
      message: result.success 
        ? `Test de scraping réussi pour ${result.availabilities?.length || 0} dates`
        : 'Échec du test de scraping',
      availabilities: result.availabilities,
    };

  } catch (error) {
    this.logger.error(`Erreur lors du test de scraping direct pour ${data.url}: ${error.message}`);
    
    return {
      success: false,
      propertyId: 'temp-test',
      platform: data.platform,
      message: 'Erreur lors du test de scraping',
      error: error.message,
    };
  }
}
}