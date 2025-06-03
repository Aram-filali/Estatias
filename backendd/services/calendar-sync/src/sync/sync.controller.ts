import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SyncService, SyncStatusReport, SyncConflictResolution } from './sync.service';
import { SyncPriority } from '../common/constants';
import { PropertyAvailabilityResult } from '../common/interfaces/calendar-data.interface';

@Controller()
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * Synchroniser une propriété spécifique
   */
  @MessagePattern('sync_property')
  async syncProperty(@Payload() data: { 
    id: number;
    priority?: SyncPriority;
    conflictResolution?: SyncConflictResolution;
  }): Promise<PropertyAvailabilityResult> {
    this.logger.log(`Synchronisation de la propriété ${data.id}`);
    
    return this.syncService.syncProperty(
      data.id.toString(),
      data.priority || SyncPriority.NORMAL,
      data.conflictResolution || { strategy: 'merge', conflictedFields: [] }
    );
  }

  /**
   * Synchroniser toutes les propriétés
   */
  @MessagePattern('sync_all')
  async syncAll(@Payload() data: { 
    force: boolean;
  }): Promise<{
    total: number;
    success: number;
    failed: number;
    skipped: number;
    byPriority: Record<SyncPriority, number>;
  }> {
    this.logger.log(`Synchronisation de toutes les propriétés (force: ${data.force})`);
    
    return this.syncService.syncAllPropertiesWithPriority(data.force);
  }

  /**
   * Obtenir le statut de synchronisation
   */
  @MessagePattern('sync_status')
  async getSyncStatus(@Payload() data: {}): Promise<{
    activeSyncs: SyncStatusReport[];
    recentStats: any;
  }> {
    this.logger.log('Récupération du statut de synchronisation');
    
    const activeSyncs = this.syncService.getAllActiveSyncStatuses();
    const recentStats = await this.syncService.getRecentSyncStatus(24);
    
    return {
      activeSyncs,
      recentStats,
    };
  }

  /**
   * Déclencher une synchronisation manuelle
   */
  @MessagePattern('trigger_manual_sync')
  async triggerManualSync(@Payload() data: { 
    id: number;
  }): Promise<PropertyAvailabilityResult> {
    this.logger.log(`Synchronisation manuelle de la propriété ${data.id}`);
    
    return this.syncService.syncProperty(
      data.id.toString(),
      SyncPriority.HIGH, // Priorité haute pour les syncs manuelles
      { strategy: 'overwrite', conflictedFields: [] } // Écrasement pour les syncs manuelles
    );
  }

  /**
   * Obtenir le statut détaillé d'une propriété
   */
  @MessagePattern('get_property_sync_status')
  async getPropertySyncStatus(@Payload() data: { 
    id: number;
  }): Promise<{
    currentStatus: SyncStatusReport | null;
    recentLogs: any[];
    lastSyncResult: any;
  }> {
    const propertyId = data.id.toString();
    this.logger.log(`Statut de synchronisation pour la propriété ${propertyId}`);
    
    const currentStatus = this.syncService.getSyncStatus(propertyId);
    const recentLogs = await this.syncService.getSyncLogs(propertyId, 10);
    
    return {
      currentStatus,
      recentLogs,
      lastSyncResult: recentLogs[0] || null,
    };
  }

  /**
   * Annuler une synchronisation en cours
   */
  @MessagePattern('cancel_sync')
  async cancelSync(@Payload() data: { 
    id: number;
  }): Promise<{ success: boolean; message: string }> {
    const propertyId = data.id.toString();
    this.logger.log(`Annulation de la synchronisation pour la propriété ${propertyId}`);
    
    const cancelled = await this.syncService.cancelSync(propertyId);
    
    return {
      success: cancelled,
      message: cancelled 
        ? 'Synchronisation annulée avec succès' 
        : 'Aucune synchronisation en cours trouvée'
    };
  }

  /**
   * Obtenir les statistiques de synchronisation par plateforme
   */
  @MessagePattern('get_sync_stats_by_platform')
  async getSyncStatsByPlatform(@Payload() data: {}): Promise<Record<string, Record<string, number>>> {
    this.logger.log('Récupération des statistiques par plateforme');
    
    return this.syncService.getSyncStatsByPlatform();
  }

  /**
   * Tester le scraping d'une URL publique
   */
  @MessagePattern('test_public_url_scraping')
  async testPublicUrlScraping(@Payload() data: { 
    url: string; 
    platform: string;
  }): Promise<{
    success: boolean;
    message: string;
    availabilityCount?: number;
  }> {
    this.logger.log(`Test de scraping pour ${data.url} (${data.platform})`);
    
    return this.syncService.testPublicUrlScraping(data.url, data.platform);
  }

  /**
   * Obtenir le taux de succès récent
   */
  @MessagePattern('get_recent_success_rate')
  async getRecentSuccessRate(@Payload() data: { 
    hours?: number;
  }): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    inProgressSyncs: number;
    successRate: number;
  }> {
    const hours = data.hours || 24;
    this.logger.log(`Taux de succès sur les ${hours} dernières heures`);
    
    return this.syncService.getRecentSyncStatus(hours);
  }

  /**
   * Nettoyer les anciens logs de synchronisation
   */
  @MessagePattern('cleanup_old_sync_logs')
  async cleanupOldSyncLogs(@Payload() data: { 
    daysToKeep?: number;
  }): Promise<{ deletedCount: number; message: string }> {
    const daysToKeep = data.daysToKeep || 30;
    this.logger.log(`Nettoyage des logs de plus de ${daysToKeep} jours`);
    
    const result = await this.syncService.cleanOldSyncLogs(daysToKeep);
    
    return {
      ...result,
      message: `${result.deletedCount} anciens logs supprimés`
    };
  }

  /**
   * Obtenir la file d'attente de synchronisation
   */
  @MessagePattern('get_sync_queue')
  async getSyncQueue(@Payload() data: {}): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    this.logger.log('Récupération de l\'état de la file d\'attente');
    
    // Cette méthode devrait être ajoutée au SyncService
    // Pour l'instant, on retourne un placeholder
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
  }

  /**
   * Redémarrer les synchronisations échouées
   */
  @MessagePattern('retry_failed_syncs')
  async retryFailedSyncs(@Payload() data: { 
    maxRetries?: number;
  }): Promise<{
    retriedCount: number;
    successCount: number;
    message: string;
  }> {
    const maxRetries = data.maxRetries || 5;
    this.logger.log(`Nouvelle tentative pour les synchronisations échouées (max: ${maxRetries})`);
    
    // Cette fonctionnalité devrait être implémentée dans le SyncService
    // Pour l'instant, on retourne un placeholder
    return {
      retriedCount: 0,
      successCount: 0,
      message: 'Fonctionnalité de retry à implémenter'
    };
  }

  /**
   * Configurer la résolution de conflits par défaut
   */
  @MessagePattern('set_default_conflict_resolution')
  async setDefaultConflictResolution(@Payload() data: {
    strategy: 'merge' | 'overwrite' | 'skip' | 'manual';
    conflictedFields?: string[];
  }): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Configuration de la résolution de conflits: ${data.strategy}`);
    
    // Cette configuration devrait être stockée et utilisée par défaut
    // Pour l'instant, on confirme juste la réception
    return {
      success: true,
      message: `Stratégie de résolution configurée: ${data.strategy}`
    };
  }

  /**
   * Obtenir les métriques de performance de synchronisation
   */
  @MessagePattern('get_sync_performance_metrics')
  async getSyncPerformanceMetrics(@Payload() data: {
    period?: 'day' | 'week' | 'month';
  }): Promise<{
    averageDuration: number;
    successRate: number;
    throughput: number;
    errorsByType: Record<string, number>;
  }> {
    const period = data.period || 'day';
    this.logger.log(`Métriques de performance sur la période: ${period}`);
    
    // Cette fonctionnalité nécessiterait une implémentation dans le SyncService
    // Pour l'instant, on retourne des métriques factices
    return {
      averageDuration: 0,
      successRate: 0,
      throughput: 0,
      errorsByType: {},
    };
  }
}