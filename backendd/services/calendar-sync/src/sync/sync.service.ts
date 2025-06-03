import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Property, PropertyDocument } from '../schema/property.schema';
import { SyncLog, SyncLogDocument } from '../schema/sync-log.schema';
import { SyncQueue, SyncQueueDocument } from '../schema/sync-queue.schema';
import { ScraperService } from '../scraper/scraper.service';
import { ConfigService } from '@nestjs/config';
import { PropertyAvailabilityResult } from '../common/interfaces/calendar-data.interface';
import { SyncStatus, SyncPriority } from '../common/constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface SyncStatusReport {
  propertyId: string;
  status: SyncStatus;
  progress: number;
  totalSteps: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  lastUpdated: Date;
}

interface ConflictItem {
  date: any;
  existing: any;
  new: any;
}

export interface SyncConflictResolution {
  strategy: 'merge' | 'overwrite' | 'skip' | 'manual';
  conflictedFields: string[];
  resolution?: any;
}

export interface WebhookNotification {
  event: 'sync_started' | 'sync_completed' | 'sync_failed' | 'conflict_detected';
  propertyId: string;
  data: any;
  timestamp: Date;
}
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly maxConcurrentSyncs: number;
  private readonly syncDelayBetweenRequests: number;
  private readonly webhookUrl?: string;
  private readonly syncStatusMap = new Map<string, SyncStatusReport>();

  constructor(
    @InjectModel(Property.name)
    private propertyModel: Model<PropertyDocument>,
    @InjectModel(SyncLog.name)
    private syncLogModel: Model<SyncLogDocument>,
    @InjectModel(SyncQueue.name)
    private syncQueueModel: Model<SyncQueueDocument>,
    private scraperService: ScraperService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.maxConcurrentSyncs = parseInt(
      this.configService.get<string>('MAX_CONCURRENT_SYNCS', '2'),
      10,
    );
    this.syncDelayBetweenRequests = parseInt(
      this.configService.get<string>('SYNC_DELAY_MS', '3000'),
      10,
    );
    this.webhookUrl = this.configService.get<string>('SYNC_WEBHOOK_URL');
  }

  /**
 * Transform scraper result to match our interface
 */
private transformScraperResult(scraperResult: any): PropertyAvailabilityResult {
  if (!scraperResult.success) {
    return {
      success: false,
      error: scraperResult.error || 'Erreur inconnue'
    };
  }

  // Transform availabilities to match our interface
  const transformedAvailabilities = scraperResult.availabilities?.map((item: any) => ({
    date: item.date,
    available: item.isAvailable ?? item.available ?? false,
    isAvailable: item.isAvailable ?? item.available ?? false,
    price: item.price,
    minStay: item.minStay,
    maxStay: item.maxStay,
    checkinAllowed: item.checkinAllowed,
    checkoutAllowed: item.checkoutAllowed,
  }));

  return {
    success: true,
    availabilities: transformedAvailabilities
  };
}

  /**
   * Enhanced property synchronization with detailed status reporting
   */
// Fixed syncProperty method with proper error handling
async syncProperty(
  propertyId: string,
  priority: SyncPriority = SyncPriority.NORMAL,
  conflictResolution: SyncConflictResolution = { strategy: 'merge', conflictedFields: [] }
): Promise<PropertyAvailabilityResult> {
  let syncLog: SyncLogDocument | null = null;
  const statusReport: SyncStatusReport = {
    propertyId,
    status: SyncStatus.STARTED,
    progress: 0,
    totalSteps: 5,
    currentStep: 'Initializing',
    lastUpdated: new Date(),
  };

  this.syncStatusMap.set(propertyId, statusReport);
  
  try {
    // Step 1: Fetch property
    this.updateSyncStatus(propertyId, 1, 'Fetching property details');
    const property = await this.propertyModel.findById(propertyId).exec();

    if (!property) {
      throw new Error(`Propriété avec l'ID ${propertyId} non trouvée`);
    }

    if (!property.publicUrl) {
      throw new Error(`URL publique manquante pour la propriété ${propertyId}`);
    }

    // Step 2: Validate platform
    this.updateSyncStatus(propertyId, 2, 'Validating platform and URL');
    this.validateSupportedPlatform(property.platform, property.publicUrl);

    // Step 3: Create sync log
    this.updateSyncStatus(propertyId, 3, 'Creating sync log');
    syncLog = new this.syncLogModel({
      propertyId: property._id,
      platform: property.platform,
      status: SyncStatus.STARTED,
      priority,
      message: `Démarrage du scraping de l'URL publique: ${property.publicUrl}`,
      createdAt: new Date(),
    });
    await syncLog.save();

    // Send webhook notification
    await this.sendWebhookNotification('sync_started', propertyId, {
      platform: property.platform,
      publicUrl: property.publicUrl,
      priority,
    });

    this.logger.log(`Scraping de l'URL publique: ${property.publicUrl} (${property.platform}) - Priority: ${priority}`);

    // Anti-detection delay
    if (this.syncDelayBetweenRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, this.syncDelayBetweenRequests));
    }

    // Step 4: Perform scraping
    this.updateSyncStatus(propertyId, 4, 'Scraping availability data');
    const scraperResult = await this.scraperService.scrapeCalendar(property);
    const result = this.transformScraperResult(scraperResult);

    // Step 5: Handle conflicts and save data
    this.updateSyncStatus(propertyId, 5, 'Processing results and handling conflicts');
    
    if (result.success && result.availabilities) {
      await this.handleDataConflicts(property, result.availabilities, conflictResolution);
    }

    // Update property sync timestamp
    await this.propertyModel.findByIdAndUpdate(
      property._id,
      { 
        lastSynced: new Date(),
        syncStatus: result.success ? SyncStatus.SUCCESS : SyncStatus.ERROR,
      },
      { new: true }
    ).exec();

    // Update sync log
    if (result.success) {
      syncLog.status = SyncStatus.SUCCESS;
      syncLog.message = `Scraping réussi: ${result.availabilities?.length || 0} dates récupérées depuis l'URL publique`;
      
      this.updateSyncStatus(propertyId, 5, 'Completed successfully', SyncStatus.SUCCESS);
      
      await this.sendWebhookNotification('sync_completed', propertyId, {
        availabilityCount: result.availabilities?.length || 0,
        duration: Date.now() - statusReport.lastUpdated.getTime(),
      });
    } else {
      syncLog.status = SyncStatus.ERROR;
      syncLog.message = `Échec du scraping:Erreur inconnue`;
      
      this.updateSyncStatus(propertyId, 5, 'Failed', SyncStatus.ERROR);
      
      await this.sendWebhookNotification('sync_failed', propertyId, {
        error:  'Erreur inconnue',
        duration: Date.now() - statusReport.lastUpdated.getTime(),
      });
    }
    
    syncLog.completedAt = new Date();
    await syncLog.save();

    this.logger.log(`Scraping terminé pour ${property.publicUrl}: ${result.success ? 'succès' : 'échec'}`);

    // Clean up status tracking
    this.syncStatusMap.delete(propertyId);

    return result;
  } catch (error) {
    this.logger.error(`Erreur lors du scraping de la propriété ${propertyId}: ${error.message}`);

    // Update error status
    this.updateSyncStatus(propertyId, -1, `Error: ${error.message}`, SyncStatus.ERROR);

    // Update sync log
    if (syncLog) {
      syncLog.status = SyncStatus.ERROR;
      syncLog.message = `Erreur lors du scraping: ${error.message}`;
      syncLog.completedAt = new Date();
      await syncLog.save();
    }

    // Send error webhook
    await this.sendWebhookNotification('sync_failed', propertyId, {
      error: error.message,
    });
    
    // Clean up status tracking
    this.syncStatusMap.delete(propertyId);
    
    return { success: false, error: error.message };
  }
}

  /**
   * Enhanced sync with priority queue management
   */
  async syncAllPropertiesWithPriority(forceAll: boolean = false): Promise<{
    total: number;
    success: number;
    failed: number;
    skipped: number;
    byPriority: Record<SyncPriority, number>;
  }> {
    try {
      this.logger.log('Démarrage de la synchronisation prioritaire de toutes les propriétés');
      
      // Build priority queue
      await this.buildSyncQueue(forceAll);
      
      // Get queued items ordered by priority
      const queuedSyncs = await this.syncQueueModel
        .find({ status: 'pending' })
        .sort({ priority: 1, createdAt: 1 }) // Lower number = higher priority
        .exec();
      
      const results = {
        total: queuedSyncs.length,
        success: 0,
        failed: 0,
        skipped: 0,
        byPriority: {
          [SyncPriority.HIGH]: 0,
          [SyncPriority.NORMAL]: 0,
          [SyncPriority.LOW]: 0,
        },
      };
      
      // Process queue in priority order
      for (const queueItem of queuedSyncs) {
        try {
          // Mark as processing
          queueItem.status = 'processing';
          queueItem.startedAt = new Date();
          await queueItem.save();

          const result = await this.syncProperty(
            queueItem.propertyId.toString(),
            queueItem.priority
          );
          
          if (result.success) {
            results.success++;
            queueItem.status = 'completed';
          } else {
            results.failed++;
            queueItem.status = 'failed';
            queueItem.errorMessage = result.error;
          }
          
          results.byPriority[queueItem.priority]++;
          queueItem.completedAt = new Date();
          await queueItem.save();
          
        } catch (error) {
          this.logger.error(`Erreur lors du traitement de la queue ${queueItem._id}: ${error.message}`);
          results.failed++;
          
          queueItem.status = 'failed';
          queueItem.errorMessage = error.message;
          queueItem.completedAt = new Date();
          await queueItem.save();
        }
        
        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, this.syncDelayBetweenRequests));
      }
      
      this.logger.log(`Synchronisation prioritaire terminée. ${results.success} réussies, ${results.failed} échouées`);
      
      return results;
    } catch (error) {
      this.logger.error(`Erreur lors de la synchronisation prioritaire: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build sync queue with intelligent prioritization
   */
  private async buildSyncQueue(forceAll: boolean = false): Promise<void> {
    // Clear existing pending queue items
    await this.syncQueueModel.deleteMany({ status: 'pending' }).exec();

    let properties: PropertyDocument[];
    
    if (forceAll) {
      properties = await this.propertyModel
        .find({
          publicUrl: { $ne: null, $exists: true },
          active: true,
        })
        .exec();
    } else {
      const syncThreshold = new Date();
      syncThreshold.setHours(syncThreshold.getHours() - 24);
      
      properties = await this.propertyModel
        .find({
          $and: [
            { publicUrl: { $ne: null, $exists: true } },
            { active: true },
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

    // Create queue items with intelligent prioritization
    const queueItems = properties.map(property => {
      const priority = this.calculateSyncPriority(property);
      
      return new this.syncQueueModel({
        propertyId: property._id,
        priority,
        status: 'pending',
        createdAt: new Date(),
      });
    });

    await this.syncQueueModel.insertMany(queueItems);
    this.logger.log(`Queue construite avec ${queueItems.length} éléments`);
  }

  /**
   * Calculate sync priority based on various factors
   */
  private calculateSyncPriority(property: PropertyDocument): SyncPriority {
    let score = 0;

    // Factor 1: Time since last sync
    if (!property.lastSynced) {
      score += 3; // Never synced = high priority
    } else {
      const hoursSinceSync = (Date.now() - property.lastSynced.getTime()) / (1000 * 60 * 60);
      if (hoursSinceSync > 48) score += 2;
      else if (hoursSinceSync > 24) score += 1;
    }

    // Factor 2: Previous sync failures
    // This would require tracking failure count in property schema
    // if (property.consecutiveFailures && property.consecutiveFailures > 2) {
    //   score += 2;
    // }

    // Factor 3: Property importance (could be based on booking frequency, revenue, etc.)
    // if (property.isHighValue) score += 1;

    // Factor 4: Platform reliability
    if (property.platform === 'booking') {
      score += 1; // Booking.com might be more stable
    }

    // Convert score to priority
    if (score >= 4) return SyncPriority.HIGH;
    if (score >= 2) return SyncPriority.NORMAL;
    return SyncPriority.LOW;
  }

  /**
   * Handle data conflicts with configurable resolution strategies
   */
  private async handleDataConflicts(
    property: PropertyDocument,
    newAvailabilities: any[],
    resolution: SyncConflictResolution
  ): Promise<void> {
    // Get existing availability data
    const existingData = property.availabilities || [];
    
    if (existingData.length === 0) {
      // No existing data, no conflicts
      await this.propertyModel.findByIdAndUpdate(
        property._id,
        { availabilities: newAvailabilities }
      ).exec();
      return;
    }

    // Detect conflicts (simplified logic)
    const conflicts = this.detectConflicts(existingData, newAvailabilities);
    
    if (conflicts.length === 0) {
      // No conflicts, safe to update
      await this.propertyModel.findByIdAndUpdate(
        property._id,
        { availabilities: newAvailabilities }
      ).exec();
      return;
    }

    // Handle conflicts based on strategy
    let resolvedData: any[];
    
    switch (resolution.strategy) {
      case 'merge':
        resolvedData = this.mergeAvailabilities(existingData, newAvailabilities);
        break;
      case 'overwrite':
        resolvedData = newAvailabilities;
        break;
      case 'skip':
        resolvedData = existingData;
        return; // Don't update
      case 'manual':
        // Emit event for manual resolution
        this.eventEmitter.emit('sync.conflict.manual', {
          propertyId: property._id,
          conflicts,
          existingData,
          newData: newAvailabilities,
        });
        
        await this.sendWebhookNotification('conflict_detected', property._id.toString(), {
          conflicts,
          existingDataCount: existingData.length,
          newDataCount: newAvailabilities.length,
        });
        
        return; // Don't auto-resolve
      default:
        resolvedData = newAvailabilities;
    }

    // Update with resolved data
    await this.propertyModel.findByIdAndUpdate(
      property._id,
      { availabilities: resolvedData }
    ).exec();
  }

/**
 * Detect conflicts between existing and new availability data
 */
private detectConflicts(existing: any[], newData: any[]): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  
  // Simple conflict detection - check for date overlaps with different availability status
  for (const newItem of newData) {
    const existingItem = existing.find(e => 
      e.date && newItem.date && 
      new Date(e.date).toDateString() === new Date(newItem.date).toDateString()
    );
    
    if (existingItem && existingItem.available !== newItem.available) {
      conflicts.push({
        date: newItem.date,
        existing: existingItem,
        new: newItem,
      });
    }
  }
  
  return conflicts;
}

  /**
   * Merge availability data with conflict resolution
   */
  private mergeAvailabilities(existing: any[], newData: any[]): any[] {
    const merged = [...existing];
    
    for (const newItem of newData) {
      const existingIndex = merged.findIndex(e => 
        e.date && newItem.date && 
        new Date(e.date).toDateString() === new Date(newItem.date).toDateString()
      );
      
      if (existingIndex >= 0) {
        // Merge strategy: prefer newer data but keep additional fields
        merged[existingIndex] = { ...merged[existingIndex], ...newItem };
      } else {
        merged.push(newItem);
      }
    }
    
    return merged;
  }

  /**
   * Update sync status with detailed reporting
   */
  private updateSyncStatus(
    propertyId: string,
    step: number,
    currentStep: string,
    status: SyncStatus = SyncStatus.IN_PROGRESS
  ): void {
    const report = this.syncStatusMap.get(propertyId);
    if (report) {
      report.progress = Math.max(0, Math.min(100, (step / report.totalSteps) * 100));
      report.currentStep = currentStep;
      report.status = status;
      report.lastUpdated = new Date();
      
      // Emit real-time status update
      this.eventEmitter.emit('sync.status.updated', report);
    }
  }

  /**
   * Send webhook notifications
   */
  private async sendWebhookNotification(
    event: WebhookNotification['event'],
    propertyId: string,
    data: any
  ): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      const notification: WebhookNotification = {
        event,
        propertyId,
        data,
        timestamp: new Date(),
      };

      // In a real implementation, you'd use HTTP client to send this
      // await this.httpService.post(this.webhookUrl, notification).toPromise();
      
      this.eventEmitter.emit('webhook.sent', notification);
      this.logger.debug(`Webhook notification sent: ${event} for property ${propertyId}`);
    } catch (error) {
      this.logger.error(`Failed to send webhook notification: ${error.message}`);
    }
  }

  /**
   * Get real-time sync status for a property
   */
  getSyncStatus(propertyId: string): SyncStatusReport | null {
    return this.syncStatusMap.get(propertyId) || null;
  }

  /**
   * Get all active sync statuses
   */
  getAllActiveSyncStatuses(): SyncStatusReport[] {
    return Array.from(this.syncStatusMap.values());
  }

  /**
   * Cancel an ongoing sync
   */
  async cancelSync(propertyId: string): Promise<boolean> {
    const status = this.syncStatusMap.get(propertyId);
    if (!status) return false;

    // Mark as cancelled
    status.status = SyncStatus.CANCELLED;
    status.currentStep = 'Cancelled by user';
    
    // Clean up
    this.syncStatusMap.delete(propertyId);
    
    // Update any pending queue items
    await this.syncQueueModel.findOneAndUpdate(
      { propertyId, status: 'processing' },
      { status: 'cancelled', completedAt: new Date() }
    ).exec();

    this.eventEmitter.emit('sync.cancelled', { propertyId });
    return true;
  }

  /**
   * Automatic cleanup job for old sync data
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async automaticCleanup(): Promise<void> {
    try {
      this.logger.log('Démarrage du nettoyage automatique des données de synchronisation');
      
      // Clean old sync logs (30 days)
      const logsResult = await this.cleanOldSyncLogs(30);
      
      // Clean completed queue items (7 days)
      const queueCutoff = new Date();
      queueCutoff.setDate(queueCutoff.getDate() - 7);
      
      const queueResult = await this.syncQueueModel.deleteMany({
        status: { $in: ['completed', 'failed', 'cancelled'] },
        completedAt: { $lt: queueCutoff }
      }).exec();
      
      this.logger.log(`Nettoyage automatique terminé: ${logsResult.deletedCount} logs supprimés, ${queueResult.deletedCount} éléments de queue supprimés`);
    } catch (error) {
      this.logger.error(`Erreur lors du nettoyage automatique: ${error.message}`);
    }
  }

  // ... (keeping all your existing methods)
  
  private validateSupportedPlatform(platform: string, publicUrl: string): void {
    const supportedPlatforms = ['airbnb', 'booking'];
    
    if (!supportedPlatforms.includes(platform.toLowerCase())) {
      throw new Error(`Plateforme non supportée pour le scraping public: ${platform}`);
    }

    switch (platform.toLowerCase()) {
      case 'airbnb':
        if (!publicUrl.includes('airbnb.') || !publicUrl.includes('/rooms/')) {
          throw new Error('URL Airbnb invalide. Format attendu: https://www.airbnb.com/rooms/[ID]');
        }
        break;
        
      case 'booking':
        if (!publicUrl.includes('booking.com') || !publicUrl.includes('/hotel/')) {
          throw new Error('URL Booking.com invalide. Format attendu: https://www.booking.com/hotel/...');
        }
        break;
    }
  }

  async getSyncLogs(propertyId: string, limit: number = 10): Promise<SyncLogDocument[]> {
    return this.syncLogModel
      .find({ propertyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getSyncStatsByPlatform(): Promise<Record<string, Record<string, number>>> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const stats = await this.syncLogModel.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            platform: '$platform',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.platform',
          stats: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          }
        }
      }
    ]).exec();

    return stats.reduce((acc: Record<string, Record<string, number>>, stat: any) => {
      acc[stat._id] = {};
      stat.stats.forEach((s: any) => {
        acc[stat._id][s.status] = s.count;
      });
      return acc;
    }, {});
  }

  async testPublicUrlScraping(publicUrl: string, platform: string): Promise<{
    success: boolean;
    message: string;
    availabilityCount?: number;
  }> {
    try {
      this.validateSupportedPlatform(platform, publicUrl);

      const testProperty = new this.propertyModel({
        _id: new Types.ObjectId(),
        publicUrl,
        platform,
        siteId: 'test',
        active: true,
      });
      
      const result = await this.scraperService.scrapeCalendar(testProperty);
      
      return {
        success: result.success,
        message: result.success 
        ? `Test réussi: ${result.availabilities?.length || 0} dates récupérées`
        : `Test échoué: Erreur lors du scraping`,
        availabilityCount: result.availabilities?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        message: `Erreur lors du test: ${error.message}`,
      };
    }
  }

  async getRecentSyncStatus(hours: number = 24): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    inProgressSyncs: number;
    successRate: number;
  }> {
    const dateThreshold = new Date();
    dateThreshold.setHours(dateThreshold.getHours() - hours);

    const syncStats = await this.syncLogModel.aggregate([
      {
        $match: { createdAt: { $gte: dateThreshold } }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).exec();

    const stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      inProgressSyncs: 0,
      successRate: 0,
    };

    syncStats.forEach((stat: any) => {
      stats.totalSyncs += stat.count;
      
      switch (stat._id) {
        case SyncStatus.SUCCESS:
          stats.successfulSyncs = stat.count;
          break;
        case SyncStatus.ERROR:
          stats.failedSyncs = stat.count;
          break;
        case SyncStatus.STARTED:
          stats.inProgressSyncs = stat.count;
          break;
      }
    });

    stats.successRate = stats.totalSyncs > 0 
      ? (stats.successfulSyncs / stats.totalSyncs) * 100 
      : 0;

    return stats;
  }

  async cleanOldSyncLogs(daysToKeep: number = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.syncLogModel.deleteMany({
      createdAt: { $lt: cutoffDate }
    }).exec();

    this.logger.log(`Nettoyage des logs: ${result.deletedCount} anciens logs supprimés`);
    
    return { deletedCount: result.deletedCount };
  }
}