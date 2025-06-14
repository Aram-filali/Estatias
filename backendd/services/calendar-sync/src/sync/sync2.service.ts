import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Property, PropertyDocument } from '../schema/property.schema';
import { SyncLog, SyncLogDocument } from '../schema/sync-log.schema';
import { SyncQueue, SyncQueueDocument } from '../schema/sync-queue.schema';
import { Availability, AvailabilityDocument } from '../schema/availability.schema';

import { SyncService } from './sync.service';
import { ICalSyncService } from '../ICal/ICal.service';
import { SyncStatus, SyncPriority } from '../common/constants';

export interface UnifiedSyncResult {
  propertyId: string;
  scrapingResult?: {
    success: boolean;
    message: string;
    availabilityCount?: number;
  };
  icalResult?: {
    success: boolean;
    message: string;
    availabilityCount?: number;
  };
  consolidatedResult: {
    success: boolean;
    totalAvailabilities: number;
    conflicts?: ConflictSummary[];
    message: string;
  };
  syncDuration: number;
}

export interface ConflictSummary {
  date: string;
  scrapingValue?: boolean;
  icalValue?: boolean;
  resolvedValue: boolean;
  resolutionStrategy: 'scraping_priority' | 'ical_priority' | 'available_priority' | 'unavailable_priority';
}

export interface UnifiedSyncConfig {
  enableScraping: boolean;
  enableICal: boolean;
  conflictResolution: 'scraping_priority' | 'ical_priority' | 'available_priority' | 'unavailable_priority' | 'manual';
  maxParallelSyncs: number;
  delayBetweenSyncs: number;
  syncTimeoutMinutes: number;
}

export interface SyncStats {
  total: number;
  success: number;
  failed: number;
  scrapingOnly: number;
  icalOnly: number;
  bothSources: number;
  conflicts: number;
  byPriority: Record<SyncPriority, number>;
}

@Injectable()
export class UnifiedCalendarSyncService {
  private readonly logger = new Logger(UnifiedCalendarSyncService.name);
  private readonly syncConfig: UnifiedSyncConfig;
  private activeSyncs = new Map<string, { startTime: Date; sources: string[] }>();

  constructor(
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocument>,
    @InjectModel(SyncLog.name)
    private syncLogModel: Model<SyncLogDocument>,
    @InjectModel(SyncQueue.name)
    private syncQueueModel: Model<SyncQueueDocument>,
    @InjectModel(Availability.name)
    private availabilityModel: Model<AvailabilityDocument>,
    private syncService: SyncService,
    private icalSyncService: ICalSyncService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.syncConfig = {
      enableScraping: this.configService.get<boolean>('SYNC_ENABLE_SCRAPING', true),
      enableICal: this.configService.get<boolean>('SYNC_ENABLE_ICAL', true),
      conflictResolution: this.configService.get<string>('SYNC_CONFLICT_RESOLUTION', 'scraping_priority') as any,
      maxParallelSyncs: parseInt(this.configService.get<string>('MAX_PARALLEL_SYNCS', '3'), 10),
      delayBetweenSyncs: parseInt(this.configService.get<string>('SYNC_DELAY_MS', '2000'), 10),
      syncTimeoutMinutes: parseInt(this.configService.get<string>('SYNC_TIMEOUT_MINUTES', '15'), 10),
    };
  }

  /**
   * Synchronise une propriété avec tous les sources disponibles
   */
  async syncPropertyUnified(
    propertyId: string,
    priority: SyncPriority = SyncPriority.NORMAL,
    forceConfig?: Partial<UnifiedSyncConfig>
  ): Promise<UnifiedSyncResult> {
    const startTime = Date.now();
    const config = { ...this.syncConfig, ...forceConfig };
    
    this.logger.log(`🚀 Début synchronisation unifiée pour la propriété ${propertyId}`);
    
    // Vérifier si une sync est déjà en cours
    if (this.activeSyncs.has(propertyId)) {
      throw new Error(`Synchronisation déjà en cours pour la propriété ${propertyId}`);
    }

    let syncLog: SyncLogDocument | null = null;
    
    try {
      // Récupérer la propriété
      const property = await this.propertyModel.findById(propertyId);
      if (!property) {
        throw new Error(`Propriété ${propertyId} non trouvée`);
      }

      // Déterminer les sources disponibles
      const availableSources = this.getAvailableSources(property, config);
      
      if (availableSources.length === 0) {
        throw new Error('Aucune source de synchronisation disponible pour cette propriété');
      }

      // Marquer comme actif
      this.activeSyncs.set(propertyId, { startTime: new Date(), sources: availableSources });

      // Créer le log de synchronisation unifiée
      syncLog = new this.syncLogModel({
        propertyId: property._id,
        platform: property.platform,
        status: SyncStatus.STARTED,
        priority,
        message: `Synchronisation unifiée démarrée (sources: ${availableSources.join(', ')})`,
        metadata: {
          syncType: 'unified',
          sources: availableSources,
          config
        },
        createdAt: new Date(),
      });
      await syncLog.save();

      // Émettre événement de début
      this.eventEmitter.emit('unified.sync.started', {
        propertyId,
        sources: availableSources,
        priority
      });

      // Exécuter les synchronisations en parallèle
      const syncPromises: Promise<any>[] = [];
      let scrapingResult: any = null;
      let icalResult: any = null;

      if (availableSources.includes('scraping')) {
        syncPromises.push(
          this.syncService.syncProperty(propertyId, priority)
            .then(result => { scrapingResult = result; })
            .catch(error => { 
              scrapingResult = { success: false, error: error.message }; 
            })
        );
      }

      if (availableSources.includes('ical')) {
        syncPromises.push(
          this.icalSyncService.syncPropertyCalendar(propertyId)
            .then(result => { icalResult = result; })
            .catch(error => { 
              icalResult = { success: false, error: error.message }; 
            })
        );
      }

      // Attendre toutes les synchronisations avec timeout
      await Promise.race([
        Promise.all(syncPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de synchronisation')), 
          config.syncTimeoutMinutes * 60 * 1000)
        )
      ]);

      // Consolider les résultats
      const consolidatedResult = await this.consolidateResults(
        property,
        scrapingResult,
        icalResult,
        config
      );

      const result: UnifiedSyncResult = {
        propertyId,
        scrapingResult: scrapingResult ? {
          success: scrapingResult.success,
          message: scrapingResult.success ? 'Scraping réussi' : scrapingResult.error,
          availabilityCount: scrapingResult.availabilities?.length || 0,
        } : undefined,
        icalResult: icalResult ? {
          success: icalResult.success,
          message: icalResult.message || (icalResult.success ? 'iCal réussi' : 'iCal échoué'),
          availabilityCount: icalResult.availabilities?.length || 0,
        } : undefined,
        consolidatedResult,
        syncDuration: Date.now() - startTime,
      };

      // Mettre à jour le log
      syncLog.status = consolidatedResult.success ? SyncStatus.SUCCESS : SyncStatus.ERROR;
      syncLog.message = consolidatedResult.message;
      syncLog.completedAt = new Date();
      syncLog.metadata = {
        ...syncLog.metadata,
        result: result,
      };
      await syncLog.save();

      // Mettre à jour la propriété
      await this.propertyModel.findByIdAndUpdate(propertyId, {
        lastSynced: new Date(),
        syncStatus: consolidatedResult.success ? SyncStatus.SUCCESS : SyncStatus.ERROR,
        lastSyncSources: availableSources,
      });

      // Émettre événement de fin
      this.eventEmitter.emit('unified.sync.completed', {
        propertyId,
        result,
        success: consolidatedResult.success,
      });

      this.logger.log(`✅ Synchronisation unifiée terminée pour ${propertyId} en ${result.syncDuration}ms`);
      
      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erreur synchronisation unifiée ${propertyId}: ${error.message}`);
      
      if (syncLog) {
        syncLog.status = SyncStatus.ERROR;
        syncLog.message = `Erreur synchronisation unifiée: ${error.message}`;
        syncLog.completedAt = new Date();
        await syncLog.save();
      }

      this.eventEmitter.emit('unified.sync.failed', {
        propertyId,
        error: error.message,
      });

      throw error;
    } finally {
      // Nettoyer les syncs actives
      this.activeSyncs.delete(propertyId);
    }
  }

  /**
   * Synchroniser toutes les propriétés avec priorité
   */
  async syncAllPropertiesUnified(
    forceAll: boolean = false,
    config?: Partial<UnifiedSyncConfig>
  ): Promise<SyncStats> {
    this.logger.log('🚀 Début synchronisation unifiée globale');
    
    const effectiveConfig = { ...this.syncConfig, ...config };
    
    // Construire la queue de synchronisation
    await this.buildUnifiedSyncQueue(forceAll);
    
    // Récupérer les éléments à synchroniser
    const queueItems = await this.syncQueueModel
      .find({ status: 'pending' })
      .sort({ priority: 1, createdAt: 1 })
      .exec();

    const stats: SyncStats = {
      total: queueItems.length,
      success: 0,
      failed: 0,
      scrapingOnly: 0,
      icalOnly: 0,
      bothSources: 0,
      conflicts: 0,
      byPriority: {
        [SyncPriority.HIGH]: 0,
        [SyncPriority.NORMAL]: 0,
        [SyncPriority.LOW]: 0,
      },
    };

    // Traitement par lots pour respecter les limites de parallélisme
    const batches = this.chunkArray(queueItems, effectiveConfig.maxParallelSyncs);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (queueItem) => {
        try {
          queueItem.status = 'processing';
          queueItem.startedAt = new Date();
          await queueItem.save();

          const result = await this.syncPropertyUnified(
            queueItem.propertyId.toString(),
            queueItem.priority,
            effectiveConfig
          );

          if (result.consolidatedResult.success) {
            stats.success++;
            queueItem.status = 'completed';
            
            // Compter les types de synchronisation
            if (result.scrapingResult && result.icalResult) {
              stats.bothSources++;
            } else if (result.scrapingResult) {
              stats.scrapingOnly++;
            } else if (result.icalResult) {
              stats.icalOnly++;
            }
            
            // Compter les conflits
            if (result.consolidatedResult.conflicts) {
              stats.conflicts += result.consolidatedResult.conflicts.length;
            }
          } else {
            stats.failed++;
            queueItem.status = 'failed';
            queueItem.errorMessage = result.consolidatedResult.message;
          }

          stats.byPriority[queueItem.priority]++;
          queueItem.completedAt = new Date();
          await queueItem.save();

        } catch (error: any) {
          stats.failed++;
          queueItem.status = 'failed';
          queueItem.errorMessage = error.message;
          queueItem.completedAt = new Date();
          await queueItem.save();
          
          this.logger.error(`Erreur sync propriété ${queueItem.propertyId}: ${error.message}`);
        }
      });

      // Attendre le lot complet
      await Promise.all(batchPromises);
      
      // Délai entre les lots
      if (effectiveConfig.delayBetweenSyncs > 0) {
        await new Promise(resolve => setTimeout(resolve, effectiveConfig.delayBetweenSyncs));
      }
    }

    this.logger.log(`✅ Synchronisation unifiée globale terminée: ${stats.success}/${stats.total} réussies`);
    
    return stats;
  }

  /**
   * Déterminer les sources disponibles pour une propriété
   */
  private getAvailableSources(property: PropertyDocument, config: UnifiedSyncConfig): string[] {
    const sources: string[] = [];
    
    if (config.enableScraping && property.publicUrl) {
      sources.push('scraping');
    }
    
    if (config.enableICal && property.icalUrl) {
      sources.push('ical');
    }
    
    return sources;
  }

  /**
   * Consolider les résultats de différentes sources
   */
  private async consolidateResults(
    property: PropertyDocument,
    scrapingResult: any,
    icalResult: any,
    config: UnifiedSyncConfig
  ): Promise<{
    success: boolean;
    totalAvailabilities: number;
    conflicts?: ConflictSummary[];
    message: string;
  }> {
    try {
      // Collecter toutes les disponibilités
      const scrapingAvailabilities = scrapingResult?.success ? scrapingResult.availabilities || [] : [];
      const icalAvailabilities = icalResult?.success ? icalResult.availabilities || [] : [];
      
      if (scrapingAvailabilities.length === 0 && icalAvailabilities.length === 0) {
        return {
          success: false,
          totalAvailabilities: 0,
          message: 'Aucune donnée récupérée des sources disponibles'
        };
      }

      // Consolidation des données
      const consolidatedData = await this.consolidateAvailabilityData(
        scrapingAvailabilities,
        icalAvailabilities,
        config.conflictResolution
      );

      // Sauvegarder les données consolidées
      await this.saveConsolidatedAvailabilities(property._id.toString(), consolidatedData.availabilities);

      return {
        success: true,
        totalAvailabilities: consolidatedData.availabilities.length,
        conflicts: consolidatedData.conflicts,
        message: `Consolidation réussie: ${consolidatedData.availabilities.length} disponibilités, ${consolidatedData.conflicts?.length || 0} conflits résolus`
      };

    } catch (error: any) {
      return {
        success: false,
        totalAvailabilities: 0,
        message: `Erreur consolidation: ${error.message}`
      };
    }
  }

  /**
   * Consolider les données de disponibilité de différentes sources
   */
  private async consolidateAvailabilityData(
    scrapingData: any[],
    icalData: any[],
    resolutionStrategy: string
  ): Promise<{
    availabilities: any[];
    conflicts: ConflictSummary[];
  }> {
    const availabilityMap = new Map<string, any>();
    const conflicts: ConflictSummary[] = [];

    // Traiter d'abord les données de scraping
    for (const item of scrapingData) {
      const dateKey = this.normalizeDate(item.date);
      availabilityMap.set(dateKey, {
        date: dateKey,
        isAvailable: item.isAvailable ?? item.available ?? false,
        source: 'scraping',
        price: item.price,
        minStay: item.minStay,
        maxStay: item.maxStay,
        scrapingData: item,
      });
    }

    // Traiter les données iCal et détecter les conflits
    for (const item of icalData) {
      const dateKey = this.normalizeDate(item.date);
      const existing = availabilityMap.get(dateKey);
      
      if (existing) {
        // Conflit détecté
        const scrapingAvailable = existing.isAvailable;
        const icalAvailable = item.isAvailable;
        
        if (scrapingAvailable !== icalAvailable) {
          const resolvedValue = this.resolveConflict(
            scrapingAvailable,
            icalAvailable,
            resolutionStrategy
          );
          
          conflicts.push({
            date: dateKey,
            scrapingValue: scrapingAvailable,
            icalValue: icalAvailable,
            resolvedValue,
            resolutionStrategy: resolutionStrategy as any,
          });
          
          // Mettre à jour avec la valeur résolue
          availabilityMap.set(dateKey, {
            ...existing,
            isAvailable: resolvedValue,
            source: 'consolidated',
            icalData: item,
          });
        } else {
          // Pas de conflit, enrichir avec les données iCal
          availabilityMap.set(dateKey, {
            ...existing,
            source: 'both',
            icalData: item,
          });
        }
      } else {
        // Pas de données de scraping, utiliser iCal uniquement
        availabilityMap.set(dateKey, {
          date: dateKey,
          isAvailable: item.isAvailable,
          source: 'ical',
          icalData: item,
        });
      }
    }

    return {
      availabilities: Array.from(availabilityMap.values()),
      conflicts,
    };
  }

  /**
   * Résoudre un conflit selon la stratégie définie
   */
  private resolveConflict(
    scrapingValue: boolean,
    icalValue: boolean,
    strategy: string
  ): boolean {
    switch (strategy) {
      case 'scraping_priority':
        return scrapingValue;
      case 'ical_priority':
        return icalValue;
      case 'available_priority':
        return scrapingValue || icalValue; // Disponible si au moins une source dit disponible
      case 'unavailable_priority':
        return scrapingValue && icalValue; // Disponible seulement si les deux sources disent disponible
      default:
        return scrapingValue; // Par défaut, priorité au scraping
    }
  }

  /**
   * Sauvegarder les disponibilités consolidées
   */
  private async saveConsolidatedAvailabilities(
    propertyId: string,
    availabilities: any[]
  ): Promise<void> {
    const now = new Date();
    
    // Supprimer les anciennes données consolidées
    await this.availabilityModel.deleteMany({
      propertyId: new Types.ObjectId(propertyId),
      source: { $in: ['consolidated', 'unified'] }
    });

    // Sauvegarder les nouvelles données
    const documents = availabilities.map(item => ({
      propertyId: new Types.ObjectId(propertyId),
      date: new Date(item.date),
      isAvailable: item.isAvailable,
      source: 'unified',
      price: item.price,
      minStay: item.minStay,
      maxStay: item.maxStay,
      metadata: {
        originalSource: item.source,
        scrapingData: item.scrapingData,
        icalData: item.icalData,
      },
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
    }));

    if (documents.length > 0) {
      await this.availabilityModel.insertMany(documents);
    }
  }

  /**
   * Construire la queue de synchronisation unifiée
   */
  private async buildUnifiedSyncQueue(forceAll: boolean = false): Promise<void> {
    await this.syncQueueModel.deleteMany({ status: 'pending' });

    let properties: PropertyDocument[];
    
    if (forceAll) {
      properties = await this.propertyModel
        .find({
          $and: [
            { active: true },
            {
              $or: [
                { publicUrl: { $ne: null, $exists: true } },
                { icalUrl: { $ne: null, $exists: true } }
              ]
            }
          ]
        })
        .exec();
    } else {
      const syncThreshold = new Date();
      syncThreshold.setHours(syncThreshold.getHours() - 24);
      
      properties = await this.propertyModel
        .find({
          $and: [
            { active: true },
            {
              $or: [
                { publicUrl: { $ne: null, $exists: true } },
                { icalUrl: { $ne: null, $exists: true } }
              ]
            },
            {
              $or: [
                { lastSynced: { $exists: false } },
                { lastSynced: null },
                { lastSynced: { $lt: syncThreshold } }
              ]
            }
          ]
        })
        .exec();
    }

    const queueItems = properties.map(property => {
      const priority = this.calculateUnifiedSyncPriority(property);
      
      return new this.syncQueueModel({
        propertyId: property._id,
        priority,
        status: 'pending',
        metadata: {
          syncType: 'unified',
          availableSources: this.getAvailableSources(property, this.syncConfig),
        },
        createdAt: new Date() || undefined,
      });
    });

    if (queueItems.length > 0) {
      await this.syncQueueModel.insertMany(queueItems);
    }
    
    this.logger.log(`Queue unifiée construite avec ${queueItems.length} éléments`);
  }

  /**
   * Calculer la priorité de synchronisation unifiée
   */
  private calculateUnifiedSyncPriority(property: PropertyDocument): SyncPriority {
    let score = 0;

    // Temps depuis dernière sync
    if (!property.lastSynced) {
      score += 3;
    } else {
      const hoursSinceSync = (Date.now() - property.lastSynced.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync > 48) score += 2;
      else if (hoursSinceSync > 24) score += 1;
    }

    // Disponibilité de multiples sources
    const sources = this.getAvailableSources(property, this.syncConfig);
    if (sources.length > 1) score += 1; // Bonus pour multiples sources

    // Plateforme
    if (property.platform === 'booking') score += 1;

    if (score >= 4) return SyncPriority.HIGH;
    if (score >= 2) return SyncPriority.NORMAL;
    return SyncPriority.LOW;
  }

  /**
   * Cron job pour synchronisation automatique
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async automaticUnifiedSync(): Promise<void> {
    try {
      this.logger.log('🕒 Démarrage synchronisation automatique unifiée');
      
      const stats = await this.syncAllPropertiesUnified(false);
      
      this.logger.log(`✅ Synchronisation automatique terminée: ${stats.success}/${stats.total} réussies`);
      
      // Émettre événement pour monitoring
      this.eventEmitter.emit('unified.sync.automatic.completed', stats);
      
    } catch (error: any) {
      this.logger.error(`❌ Erreur synchronisation automatique: ${error.message}`);
    }
  }

  /**
   * Obtenir les statistiques de synchronisation unifiée
   */
  async getUnifiedSyncStats(days: number = 7): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageDuration: number;
    sourceStats: Record<string, number>;
    conflictStats: Record<string, number>;
  }> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const logs = await this.syncLogModel
      .find({
        createdAt: { $gte: dateThreshold },
        'metadata.syncType': 'unified'
      })
      .exec();

    const stats = {
      totalSyncs: logs.length,
      successfulSyncs: logs.filter(log => log.status === SyncStatus.SUCCESS).length,
      failedSyncs: logs.filter(log => log.status === SyncStatus.ERROR).length,
      averageDuration: 0,
      sourceStats: {} as Record<string, number>,
      conflictStats: {} as Record<string, number>,
    };

    // Calculer durée moyenne
    const durationsMs = logs
      .filter(log => log.completedAt && log.createdAt)
      .map(log => log.completedAt!.getTime() - log.createdAt!.getTime());
    
    if (durationsMs.length > 0) {
      stats.averageDuration = durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length;
    }

    // Statistiques des sources
    logs.forEach(log => {
      const sources = log.metadata?.sources || [];
      sources.forEach((source: string) => {
        stats.sourceStats[source] = (stats.sourceStats[source] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Utilitaires
   */
  private normalizeDate(date: string | Date): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Obtenir le statut des synchronisations actives
   */
  getActiveSyncs(): Array<{ propertyId: string; startTime: Date; sources: string[]; duration: number }> {
    return Array.from(this.activeSyncs.entries()).map(([propertyId, info]) => ({
      propertyId,
      startTime: info.startTime,
      sources: info.sources,
      duration: Date.now() - info.startTime.getTime(),
    }));
  }

  /**
   * Annuler une synchronisation active
   */
  async cancelUnifiedSync(propertyId: string): Promise<boolean> {
    if (!this.activeSyncs.has(propertyId)) {
      return false;
    }

    this.activeSyncs.delete(propertyId);
    
    // Mettre à jour la queue
    await this.syncQueueModel.findOneAndUpdate(
      { propertyId, status: 'processing' },
      { status: 'cancelled', completedAt: new Date() }
    );

    this.eventEmitter.emit('unified.sync.cancelled', { propertyId });
    
    return true;
  }
}