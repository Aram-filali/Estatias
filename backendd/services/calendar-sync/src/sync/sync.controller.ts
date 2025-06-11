import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, RpcException } from '@nestjs/microservices';
import { SyncService } from './sync.service';
import { SyncPriority } from '../common/constants';

interface SyncPropertyPayload {
  propertyId: string;
  priority?: SyncPriority;
  conflictResolution?: {
    strategy: 'merge' | 'overwrite' | 'skip' | 'manual';
    conflictedFields: string[];
  };
}

@Controller()
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * Synchroniser une propriété spécifique
   */
  @MessagePattern('sync.property')
  async syncProperty(
    @Payload() data: SyncPropertyPayload,
    @Ctx() context?: any // Optionnel pour éviter l'erreur
  ) {
    this.logger.log(`🔄 Réception demande sync pour propriété: ${data.propertyId}`);
    
    try {
      // Validation des données reçues
      if (!data.propertyId) {
        throw new RpcException({
          success: false,
          message: 'propertyId est requis',
          error: 'MISSING_PROPERTY_ID'
        });
      }

      // Appel du service de synchronisation
      const result = await this.syncService.syncProperty(
        data.propertyId,
        data.priority || SyncPriority.NORMAL,
        data.conflictResolution || {
          strategy: 'merge',
          conflictedFields: []
        }
      );

      if (result.success) {
        this.logger.log(`✅ Sync réussie pour propriété ${data.propertyId}`);
        return {
          success: true,
          data: {
            propertyId: data.propertyId,
            availabilityCount: result.availabilities?.length || 0,
            syncedAt: new Date().toISOString()
          },
          message: 'Synchronisation réussie'
        };
      } else {
        this.logger.error(`❌ Sync échouée pour propriété ${data.propertyId}: ${result.error}`);
        throw new RpcException({
          success: false,
          message: 'Échec de la synchronisation',
          error: result.error || 'Erreur inconnue'
        });
      }

    } catch (error) {
      this.logger.error(`💥 Erreur lors du sync de ${data.propertyId}:`, error);
      
      // Si c'est déjà une RpcException, on la relance
      if (error instanceof RpcException) {
        throw error;
      }

      // Sinon on crée une nouvelle RpcException
      throw new RpcException({
        success: false,
        message: 'Erreur interne du microservice',
        error: error.message || 'Erreur inconnue'
      });
    }
  }

  /**
   * Synchroniser toutes les propriétés avec priorité
   */
  @MessagePattern('sync.all.properties')
  async syncAllProperties(
    @Payload() data: { forceAll?: boolean },
    @Ctx() context?: any
  ) {
    this.logger.log(`🔄 Réception demande sync toutes propriétés (forceAll: ${data.forceAll})`);
    
    try {
      const result = await this.syncService.syncAllPropertiesWithPriority(
        data.forceAll || false
      );

      this.logger.log(`✅ Sync globale terminée: ${result.success} succès, ${result.failed} échecs`);
      
      return {
        success: true,
        data: result,
        message: `Synchronisation terminée: ${result.success} réussies, ${result.failed} échouées`
      };

    } catch (error) {
      this.logger.error('💥 Erreur lors du sync global:', error);
      
      throw new RpcException({
        success: false,
        message: 'Erreur lors de la synchronisation globale',
        error: error.message || 'Erreur inconnue'
      });
    }
  }

  /**
   * Obtenir le statut d'une synchronisation
   */
  @MessagePattern('sync.status')
  async getSyncStatus(
    @Payload() data: { propertyId: string },
    @Ctx() context?: any
  ) {
    try {
      const status = this.syncService.getSyncStatus(data.propertyId);
      
      return {
        success: true,
        data: status,
        message: status ? 'Statut trouvé' : 'Aucune synchronisation en cours'
      };

    } catch (error) {
      this.logger.error(`Erreur lors de la récupération du statut pour ${data.propertyId}:`, error);
      
      throw new RpcException({
        success: false,
        message: 'Erreur lors de la récupération du statut',
        error: error.message
      });
    }
  }

  /**
   * Annuler une synchronisation
   */
  @MessagePattern('sync.cancel')
  async cancelSync(
    @Payload() data: { propertyId: string },
    @Ctx() context?: any
  ) {
    try {
      const cancelled = await this.syncService.cancelSync(data.propertyId);
      
      return {
        success: true,
        data: { cancelled },
        message: cancelled ? 'Synchronisation annulée' : 'Aucune synchronisation à annuler'
      };

    } catch (error) {
      this.logger.error(`Erreur lors de l'annulation pour ${data.propertyId}:`, error);
      
      throw new RpcException({
        success: false,
        message: 'Erreur lors de l\'annulation',
        error: error.message
      });
    }
  }

  /**
   * Obtenir les statistiques de synchronisation
   */
  @MessagePattern('sync.stats')
  async getSyncStats(@Ctx() context?: any) {
    try {
      const [platformStats, recentStatus] = await Promise.all([
        this.syncService.getSyncStatsByPlatform(),
        this.syncService.getRecentSyncStatus(24)
      ]);

      return {
        success: true,
        data: {
          platformStats,
          recentStatus,
          activeSyncs: this.syncService.getAllActiveSyncStatuses()
        },
        message: 'Statistiques récupérées'
      };

    } catch (error) {
      this.logger.error('Erreur lors de la récupération des stats:', error);
      
      throw new RpcException({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  }

  /**
   * Tester le scraping d'une URL publique
   */
  @MessagePattern('sync.test.url')
  async testPublicUrl(
    @Payload() data: { publicUrl: string; platform: string },
    @Ctx() context?: any
  ) {
    try {
      if (!data.publicUrl || !data.platform) {
        throw new RpcException({
          success: false,
          message: 'publicUrl et platform sont requis',
          error: 'MISSING_PARAMETERS'
        });
      }

      const result = await this.syncService.testPublicUrlScraping(
        data.publicUrl,
        data.platform
      );

      return {
        success: result.success,
        data: result,
        message: result.message
      };

    } catch (error) {
      this.logger.error('Erreur lors du test URL:', error);
      
      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException({
        success: false,
        message: 'Erreur lors du test de l\'URL',
        error: error.message
      });
    }
  }
}