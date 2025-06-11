// api-gateway/src/cal-sync/cal-sync.controller.ts - Version sans Swagger
import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';
import { firstValueFrom, timeout } from 'rxjs';
import { IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';


// Enums
enum SyncPriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3
}

enum ConflictStrategy {
  MERGE = 'merge',
  OVERWRITE = 'overwrite',
  SKIP = 'skip',
  MANUAL = 'manual'
}

// DTOs
class SyncConflictResolutionDto {
  @IsEnum(ConflictStrategy)
  strategy: ConflictStrategy;

  @IsArray()
  @IsString({ each: true })
  conflictedFields: string[];

  @IsOptional()
  resolution?: any;
}

class SyncPropertyDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsOptional()
  @IsEnum(SyncPriority)
  priority?: SyncPriority;

  @IsOptional()
  @ValidateNested()
  @Type(() => SyncConflictResolutionDto)
  conflictResolution?: SyncConflictResolutionDto;
}

class SyncAllPropertiesDto {
  @IsOptional()
  forceAll?: boolean;
}

class TestPublicUrlDto {
  @IsString()
  @IsNotEmpty()
  publicUrl: string;

  @IsString()
  @IsNotEmpty()
  platform: string;
}

class GetSyncLogsDto {
  @IsOptional()
  limit?: number;
}

class CleanOldLogsDto {
  @IsOptional()
  daysToKeep?: number;
}

class GetRecentSyncStatusDto {
  @IsOptional()
  hours?: number;
}


// DTOs pour iCal
class TestICalUrlDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'URL iCal invalide' })
  url: string;
}

class UpdatePropertyICalDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'URL iCal invalide' })
  icalUrl: string;
}

@Controller('cal-sync')
export class CalSyncController {
  private readonly logger = new Logger(CalSyncController.name);

  constructor(
    @Inject('CALENDAR_SERVICE') private readonly calendarClient: ClientProxy,
    @Inject('SYNC_SERVICE') private readonly syncClient: ClientProxy,
    @Inject('MONITORING_SERVICE') private readonly monitoringClient: ClientProxy,
    @Inject('SCRAPER_SERVICE') private readonly scraperClient: ClientProxy,
  ) {}

  // =================== ENDPOINTS EXISTANTS ===================
  @Post('properties')
async createProperty(@Body() dto: any) {
  this.logger.log(`Création d'une nouvelle propriété: ${JSON.stringify(dto)}`);
  
  try {
    const result = await firstValueFrom(
      this.calendarClient.send('property.create', dto).pipe(
        timeout(30000) // 30 seconds timeout
      )
    );

    this.logger.log(`✅ Propriété créée avec succès: ${JSON.stringify(result)}`);
    return result;

  } catch (error: any) {
    this.logger.error(`❌ Erreur création propriété: ${JSON.stringify(error)}`);
    
    // Log the full error details for debugging
    this.logger.error(`Error details:`, {
      message: error?.message,
      status: error?.status,
      response: error?.response,
      stack: error?.stack
    });

    // Handle microservice errors
    if (error?.status === 'error') {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Erreur lors de la création de la propriété',
          details: error
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError') {
      throw new HttpException(
        {
          success: false,
          message: 'Timeout lors de la création de la propriété'
        },
        HttpStatus.REQUEST_TIMEOUT
      );
    }

    // Handle other errors  scraper.test.direct
    throw new HttpException(
      {
        success: false,
        message: 'Erreur interne lors de la création de la propriété',
        error: error.message
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

  @Get('properties')
  getAllProperties() {
    this.logger.log('Récupération de toutes les propriétés');
    return this.calendarClient.send('properties.findAll', {});
  }

  @Get('properties/:id')
  getPropertyById(@Param('id') id: string) {
    this.logger.log(`Récupération de la propriété avec ID: ${id}`);
    return this.calendarClient.send('property.findById', id);
  }

  @Get('properties/by-url')
  getPropertyByUrl(@Query('url') url: string, @Query('platform') platform: string) {
    this.logger.log(`Récupération de la propriété par URL: ${url} (${platform})`);
    return this.calendarClient.send('property.findByUrl', { url, platform });
  }

  @Get('properties/by-site-id')
  getPropertyBySiteId(@Query('siteId') siteId: string, @Query('platform') platform: string) {
    this.logger.log(`Récupération de la propriété par siteId: ${siteId} (${platform})`);
    return this.calendarClient.send('property.findBySiteId', { siteId, platform });
  }

  @Get('properties/:id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    this.logger.log(`Disponibilités pour ${id} du ${startDate} au ${endDate}`);
    return this.calendarClient.send('calendar.detectConflicts', {
      propertyId: id,
      startDate,
      endDate,
    });
  }

  @Post('availability')
  updateAvailability(@Body() dto: any) {
    this.logger.log(`Mise à jour de disponibilité: ${JSON.stringify(dto)}`);
    return this.calendarClient.send('availability.update', dto);
  }

  @Get('properties/:id/export')
  exportCalendar(@Param('id') id: string, @Query('format') format = 'json') {
    this.logger.log(`Export du calendrier ${id} au format ${format}`);
    return this.calendarClient.send('calendar.export', {
      propertyId: id,
      options: { format },
    });
  }

  /*@Get('test-url')
  testUrl(@Query('url') url: string, @Query('platform') platform: string) {
    this.logger.log(`Test URL: ${url} (${platform})`);
    return this.calendarClient.send('property.testUrl', { 
      publicUrl: url,
      platform 
    });
  }*/

  @Post('sync/trigger-manual/:id')
  triggerManualSync(@Param('id') id: string) {
    this.logger.log(`Sync manuelle pour propriété ${id}`);
    return this.syncClient.send('trigger_manual_sync', { id: parseInt(id) });
  }

  @Get('monitoring/stats')
  getMonitoringStats() {
    this.logger.log('Statistiques de monitoring');
    return this.monitoringClient.send('get_stats', {});
  }

  @Get('monitoring/success-rate')
  getSuccessRate(@Query('platform') platform: string, @Query('hours') hours = '24') {
    this.logger.log(`Taux de succès pour ${platform} sur ${hours}h`);
    return this.monitoringClient.send('get_success_rate', {
      platform,
      hours: parseInt(hours),
    });
  }

  @Post('scraping/test')
  testScraping(@Body() body: { 
    propertyId?: string; 
    url?: string; 
    platform: string;
    testMode?: boolean;
  }) {
    this.logger.log(`Test scraping: ${JSON.stringify(body)}`);
    
    if (body.propertyId) {
      return this.scraperClient.send('scraper.calendar.scrape', {
        propertyId: body.propertyId
      });
    }
    
    return {
      success: false,
      error: 'propertyId ou url requis'
    };
  }

  @Post('scraping/test-direct')
  testScrapingDirect(@Body() body: { url: string; platform: string }) {
    this.logger.log(`Test scraping direct: ${body.url} (${body.platform})`);
    return this.scraperClient.send('scraper.test.direct', {
      url: body.url,
      platform: body.platform,
      testMode: true
    });
  }

  @Get('scraping/proxy-status')
  getProxyStatus() {
    this.logger.log('Statut des proxies');
    return this.scraperClient.send('get_proxy_status', {});
  }

  @Post('scraping/prioritize-trial-proxies')
  prioritizeTrialProxies() {
    this.logger.log('Priorisation des proxies de test');
    return this.scraperClient.send('prioritize_trial_proxies', {});
  }

  @Post('scraping/create-trial-account')
  createTrialAccount() {
    this.logger.log('Création compte d\'essai');
    return this.scraperClient.send('create_trial_account', {});
  }

  @Get('scraping/trial-accounts')
  getTrialAccounts() {
    this.logger.log('Comptes d\'essai disponibles');
    return this.scraperClient.send('get_trial_accounts', {});
  }

  // =================== NOUVEAUX ENDPOINTS ICAL ===================

  @Post('ical/sync/:propertyId')
  async syncPropertyICalendar(@Param('propertyId') propertyId: string) {
    this.logger.log(`🚀 Demande sync iCal pour propriété ${propertyId}`);
    
    try {
      const result = await firstValueFrom(
        this.calendarClient.send(
          { cmd: 'sync_property_calendar' },
          { propertyId }
        ).pipe(timeout(60000))
      );

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            message: result.message,
            error: 'ICAL_SYNC_FAILED'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erreur sync iCal: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Erreur interne lors de la synchronisation iCal',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('ical/test-url')
  @UsePipes(new ValidationPipe({ transform: true }))
  async testICalUrl(@Body() testDto: TestICalUrlDto) {
    this.logger.log(`🧪 Test URL iCal ${testDto.url}`);
    
    try {
      const result = await firstValueFrom(
        this.calendarClient.send(
          { cmd: 'test_ical_url' },
          { url: testDto.url }
        ).pipe(timeout(30000))
      );

      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erreur test URL iCal: ${error.message}`);
      
      throw new HttpException(
        {
          valid: false,
          message: 'Erreur lors du test de l\'URL iCal',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('ical/sync-all')
  async syncAllPropertiesWithICal() {
    this.logger.log(`🚀 Demande sync globale iCal`);
    
    try {
      const result = await firstValueFrom(
        this.calendarClient.send(
          { cmd: 'sync_all_properties_ical' },
          {}
        ).pipe(timeout(300000)) // 5 minutes timeout
      );

      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erreur sync globale iCal: ${error.message}`);
      
      throw new HttpException(
        {
          total: 0,
          success: 0,
          failed: 0,
          message: 'Erreur lors de la synchronisation globale iCal',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('ical/update-url')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updatePropertyICalUrl(@Body() updateDto: UpdatePropertyICalDto) {
    this.logger.log(`🔄 Mise à jour URL iCal pour ${updateDto.propertyId}`);
    
    try {
      const result = await firstValueFrom(
        this.calendarClient.send(
          { cmd: 'update_property_ical' },
          { 
            propertyId: updateDto.propertyId,
            icalUrl: updateDto.icalUrl
          }
        ).pipe(timeout(60000))
      );

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            message: result.message,
            error: 'ICAL_UPDATE_FAILED'
          },
          HttpStatus.BAD_REQUEST
        );
      }

      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erreur mise à jour URL iCal: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la mise à jour de l\'URL iCal',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('ical/logs/:propertyId')
  async getICalSyncLogs(
    @Param('propertyId') propertyId: string,
    @Query('limit') limit = '10'
  ) {
    this.logger.log(`📋 Récupération logs iCal pour ${propertyId}`);
    
    try {
      const result = await firstValueFrom(
        this.calendarClient.send(
          { cmd: 'get_ical_sync_logs' },
          { 
            propertyId,
            limit: parseInt(limit)
          }
        ).pipe(timeout(10000))
      );

      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erreur récupération logs: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des logs',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('ical/status/:propertyId')
  async getICalSyncStatus(@Param('propertyId') propertyId: string) {
    this.logger.log(`📊 Statut sync iCal pour ${propertyId}`);
    
    try {
      const result = await firstValueFrom(
        this.calendarClient.send(
          { cmd: 'get_ical_sync_status' },
          { propertyId }
        ).pipe(timeout(10000))
      );

      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erreur récupération statut: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération du statut',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Synchroniser une propriété spécifique (scraping)
   */
  @Post('property')
  @UsePipes(new ValidationPipe({ transform: true }))
  async syncProperty(@Body() syncDto: SyncPropertyDto) {
    this.logger.log(`🚀 Demande sync scraping pour propriété ${syncDto.propertyId}`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.property', {
          propertyId: syncDto.propertyId,
          priority: syncDto.priority || SyncPriority.NORMAL,
          conflictResolution: syncDto.conflictResolution || { 
            strategy: ConflictStrategy.MERGE, 
            conflictedFields: [] 
          }
        }).pipe(timeout(300000)) // 5 minutes timeout
      );

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            message: result.message || 'Échec de la synchronisation',
            error: result.error
          },
          HttpStatus.BAD_REQUEST
        );
      }

      return {
        success: true,
        data: result.data,
        message: result.message || 'Synchronisation réussie'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur sync propriété ${syncDto.propertyId}: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Erreur interne lors de la synchronisation',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Synchroniser toutes les propriétés avec gestion de priorité
   */
  @Post('all-properties')
  @UsePipes(new ValidationPipe({ transform: true }))
  async syncAllProperties(@Body() syncAllDto: SyncAllPropertiesDto) {
    this.logger.log(`🚀 Demande sync globale - Force: ${syncAllDto.forceAll || false}`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.all_properties', {
          forceAll: syncAllDto.forceAll || false
        }).pipe(timeout(1800000)) // 30 minutes timeout
      );

      if (!result.success) {
        throw new HttpException(
          {
            success: false,
            message: result.message || 'Échec de la synchronisation globale',
            error: result.error
          },
          HttpStatus.BAD_REQUEST
        );
      }

      return {
        success: true,
        data: result.data,
        message: result.message || 'Synchronisation globale terminée'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur sync globale: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Erreur interne lors de la synchronisation globale',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtenir le statut de synchronisation d'une propriété
   */
  @Get('status/:propertyId')
  async getSyncStatus(@Param('propertyId') propertyId: string) {
    this.logger.log(`📊 Récupération statut sync pour ${propertyId}`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.get_status', {
          propertyId
        }).pipe(timeout(10000))
      );

      return {
        success: true,
        data: result.data,
        message: result.message || 'Statut récupéré'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur récupération statut ${propertyId}: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération du statut',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtenir tous les statuts de synchronisation actifs
   */
  @Get('status/all')
  async getAllActiveSyncStatuses() {
    this.logger.log(`📊 Récupération de tous les statuts actifs`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.get_all_statuses', {}).pipe(timeout(10000))
      );

      return {
        success: true,
        data: result.data,
        message: result.message || 'Statuts récupérés'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur récupération tous statuts: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des statuts',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Annuler une synchronisation en cours
   */
  @Delete('cancel/:propertyId')
  async cancelSync(@Param('propertyId') propertyId: string) {
    this.logger.log(`🛑 Annulation sync pour ${propertyId}`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.cancel', {
          propertyId
        }).pipe(timeout(10000))
      );

      return {
        success: true,
        data: result.data,
        message: result.message || 'Synchronisation annulée'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur annulation sync ${propertyId}: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de l\'annulation',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtenir les logs de synchronisation d'une propriété
   */
  @Get('logs/:propertyId')
  async getSyncLogs(
    @Param('propertyId') propertyId: string,
    @Query() queryDto: GetSyncLogsDto
  ) {
    this.logger.log(`📋 Récupération logs sync pour ${propertyId}`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.get_logs', {
          propertyId,
          limit: queryDto.limit || 10
        }).pipe(timeout(10000))
      );

      return {
        success: true,
        data: result.data,
        message: result.message || 'Logs récupérés'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur récupération logs ${propertyId}: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des logs',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtenir les statistiques de synchronisation par plateforme
   */
  @Get('stats/by-platform')
  async getSyncStatsByPlatform() {
    this.logger.log(`📈 Récupération stats par plateforme`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.get_stats_by_platform', {}).pipe(timeout(10000))
      );

      return {
        success: true,
        data: result.data,
        message: result.message || 'Statistiques récupérées'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur récupération stats par plateforme: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des statistiques',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }



  /**
   * Obtenir le statut récent des synchronisations
   */
  @Get('stats/recent')
  async getRecentSyncStatus(@Query() queryDto: GetRecentSyncStatusDto) {
    this.logger.log(`📊 Récupération statut récent (${queryDto.hours || 24}h)`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.get_recent_status', {
          hours: queryDto.hours || 24
        }).pipe(timeout(10000))
      );

      return {
        success: true,
        data: result.data,
        message: result.message || 'Statut récent récupéré'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur récupération statut récent: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération du statut récent',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Nettoyer les anciens logs de synchronisation
   */
  @Delete('logs/cleanup')
  async cleanOldSyncLogs(@Query() queryDto: CleanOldLogsDto) {
    this.logger.log(`🧹 Nettoyage logs anciens (${queryDto.daysToKeep || 30} jours)`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.clean_old_logs', {
          daysToKeep: queryDto.daysToKeep || 30
        }).pipe(timeout(30000))
      );

      return {
        success: true,
        data: result.data,
        message: result.message || 'Nettoyage terminé'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur nettoyage logs: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors du nettoyage des logs',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Déclencher le nettoyage automatique
   */
  @Post('cleanup/trigger')
  async triggerAutomaticCleanup() {
    this.logger.log(`🧹 Déclenchement nettoyage automatique`);
    
    try {
      const result = await firstValueFrom(
        this.syncClient.send('sync.trigger_cleanup', {}).pipe(timeout(60000))
      );

      return {
        success: true,
        message: result.message || 'Nettoyage automatique déclenché'
      };

    } catch (error: any) {
      this.logger.error(`❌ Erreur nettoyage automatique: ${error.message}`);
      
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors du nettoyage automatique',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Health check pour le service de synchronisation
   */
  @Get('health')
  async healthCheck() {
    this.logger.log(`🏥 Health check sync service`);
    
    try {
      // Vérifier si le service répond
      const result = await firstValueFrom(
        this.syncClient.send('sync.get_all_statuses', {}).pipe(timeout(5000))
      );

      return {
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        activeSyncs: result.data?.length || 0
      };

    } catch (error: any) {
      this.logger.error(`❌ Health check failed: ${error.message}`);
      
      return {
        success: false,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  @Get('test-url')
testUrlGet(@Query('url') url: string, @Query('platform') platform: string) {
  this.logger.log(`Test URL GET: ${url} (${platform})`);
  return this.calendarClient.send('property.testUrl', { 
    publicUrl: url,
    platform 
  });
}

// Et modifiez l'endpoint POST test-url existant pour éviter les conflits
@Post('test-url-scraping')
@UsePipes(new ValidationPipe({ transform: true }))
async testPublicUrlScraping(@Body() testDto: TestPublicUrlDto) {
  this.logger.log(`🧪 Test URL scraping ${testDto.publicUrl} (${testDto.platform})`);
  
  try {
    const result = await firstValueFrom(
      this.syncClient.send('sync.test_public_url', {
        publicUrl: testDto.publicUrl,
        platform: testDto.platform
      }).pipe(timeout(60000))
    );

    return {
      success: true,
      data: result.data,
      message: result.message || 'Test terminé'
    };

  } catch (error: any) {
    this.logger.error(`❌ Erreur test URL: ${error.message}`);
    
    throw new HttpException(
      {
        success: false,
        message: 'Erreur lors du test de l\'URL',
        error: error.message
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
}