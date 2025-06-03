import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from '../schema/property.schema';
import { ScraperService } from '../scraper/scraper.service';
import { ConfigService } from '../config/config.service';
import { addDays, addHours } from '../common/utils/data.utils';

interface SyncMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  lastFailureTime?: Date;
  consecutiveFailures: number;
}

interface WorkloadConfig {
  maxConcurrentSyncs: number;
  adaptiveDelay: boolean;
  circuitBreakerEnabled: boolean;
  backoffMultiplier: number;
}

@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);
  private isSyncRunning = false;
  private isEmergencyStopActive = false;
  private currentSyncCount = 0;
  private readonly minDelayBetweenSyncs: number;
  private readonly respectfulSyncEnabled: boolean;
  private readonly workloadConfig: WorkloadConfig;
  private syncMetrics: Map<string, SyncMetrics> = new Map();
  private dynamicDelayMultiplier = 1;
  private lastSyncDuration = 0;

  constructor(
    private scraperService: ScraperService,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(Property.name)
    private propertyModel: Model<Property>,
  ) {
    // Configuration pour un scraping respectueux et adaptatif
    this.minDelayBetweenSyncs = parseInt(
      this.configService.get('MIN_DELAY_BETWEEN_SYNCS_MS') || '5000',
      10,
    );
    this.respectfulSyncEnabled = this.configService.get('RESPECTFUL_SYNC_ENABLED') !== 'false';
    
    // Configuration de workload avancée
    this.workloadConfig = {
      maxConcurrentSyncs: parseInt(this.configService.get('MAX_CONCURRENT_SYNCS') || '2', 10),
      adaptiveDelay: this.configService.get('ADAPTIVE_DELAY_ENABLED') !== 'false',
      circuitBreakerEnabled: this.configService.get('CIRCUIT_BREAKER_ENABLED') !== 'false',
      backoffMultiplier: parseFloat(this.configService.get('BACKOFF_MULTIPLIER') || '1.5'),
    };
  }

  // Synchronisation quotidienne avec horaire dynamique
  @Cron('0 0 2-5 * * *')
  async handleDailySync() {
    if (!this.configService.syncEnabled || !this.respectfulSyncEnabled || this.isEmergencyStopActive) {
      this.logger.log('Synchronisation planifiée désactivée ou arrêt d\'urgence actif');
      return;
    }

    if (this.isSyncRunning) {
      this.logger.warn('Une synchronisation est déjà en cours, ignorée');
      return;
    }

    const syncStartTime = Date.now();
    try {
      this.isSyncRunning = true;
      
      // Vérification du circuit breaker
      if (this.shouldTriggerCircuitBreaker()) {
        this.logger.warn('Circuit breaker activé - synchronisation annulée');
        return;
      }
      
      // Délai aléatoire adaptatif
      const baseDelay = Math.floor(Math.random() * 3600000); // 0 à 1 heure
      const adaptiveDelay = this.calculateAdaptiveDelay(baseDelay);
      
      this.logger.log(`Délai adaptatif de ${Math.floor(adaptiveDelay / 60000)} minutes avant la synchronisation`);
      await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
      
      this.logger.log('Démarrage de la synchronisation quotidienne respectueuse avec workload balancing');
      
      await this.syncPropertiesDueWithBalancing();
      
      this.lastSyncDuration = Date.now() - syncStartTime;
      this.logger.log(`Synchronisation quotidienne terminée en ${this.lastSyncDuration / 1000}s`);
      
    } catch (error) {
      this.logger.error(`Erreur lors de la synchronisation quotidienne: ${error.message}`);
      this.handleSyncError(error);
    } finally {
      this.isSyncRunning = false;
      this.currentSyncCount = 0;
    }
  }

  // Synchronisation prioritaire avec gestion intelligente
  @Cron('0 0 */6 * * *') // Toutes les 6 heures, encore réduit
  async handlePrioritySync() {
    if (!this.configService.syncEnabled || !this.respectfulSyncEnabled || this.isEmergencyStopActive) {
      return;
    }

    if (this.isSyncRunning) {
      this.logger.warn('Une synchronisation est déjà en cours, ignorée');
      return;
    }

    try {
      this.isSyncRunning = true;
      this.logger.log('Démarrage de la synchronisation prioritaire avec workload balancing');
      
      await this.syncPriorityPropertiesWithBalancing();
      
      this.logger.log('Synchronisation prioritaire terminée');
    } catch (error) {
      this.logger.error(`Erreur lors de la synchronisation prioritaire: ${error.message}`);
      this.handleSyncError(error);
    } finally {
      this.isSyncRunning = false;
      this.currentSyncCount = 0;
    }
  }

  /**
   * Synchronisation avec workload balancing et gestion des erreurs avancée
   */
  async syncPropertiesDueWithBalancing(): Promise<void> {
    const now = new Date();
    const maxProperties = Math.min(this.configService.syncMaxProperties || 10, 4); // Encore plus conservateur
    
    // Calculer la date limite adaptative basée sur les métriques
    const adaptiveHours = this.calculateAdaptiveInterval();
    const lastSyncBefore = addHours(now, -adaptiveHours);
    
    // Requête optimisée avec index sur publicUrl et lastSynced
    const properties = await this.propertyModel
      .find({
        $and: [
          { active: true },
          { publicUrl: { $nin: [null, ''], $exists: true } },
          {
            $or: [
              { lastSynced: { $lt: lastSyncBefore } },
              { lastSynced: { $exists: false } },
              { lastSynced: null }
            ]
          }
        ]
      })
      .sort({ 
        lastSynced: 1, 
        syncFrequency: -1, // Priorité aux fréquences élevées
        _id: 1 // Ordre déterministe
      })
      .limit(maxProperties)
      .lean() // Performance: récupération sans Mongoose overhead
      .exec();
    
    this.logger.log(`${properties.length} propriétés avec URLs publiques à synchroniser (intervalle adaptatif: ${adaptiveHours}h)`);

    // Groupement par domaine pour équilibrer la charge
    const propertiesByDomain = this.groupPropertiesByDomain(properties);
    
    // Synchronisation avec workload balancing
    for (const [domain, domainProperties] of propertiesByDomain.entries()) {
      this.logger.log(`Traitement du domaine ${domain}: ${domainProperties.length} propriétés`);
      
      for (const property of domainProperties) {
        // Vérification d'arrêt d'urgence
        if (this.isEmergencyStopActive) {
          this.logger.warn('Arrêt d\'urgence activé - synchronisation interrompue');
          return;
        }

        try {
          await this.syncSinglePropertyWithMetrics(property);
          
          // Délai adaptatif entre propriétés du même domaine
          const domainDelay = this.calculateDomainSpecificDelay(domain);
          await new Promise(resolve => setTimeout(resolve, domainDelay));
          
        } catch (error) {
          this.logger.error(`Erreur sync propriété ${property._id}: ${error.message}`);
          
          // Gestion d'erreur avec backoff exponentiel
          const backoffDelay = this.calculateBackoffDelay(domain);
          this.logger.warn(`Attente backoff de ${Math.floor(backoffDelay / 1000)}s pour ${domain}`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
      
      // Délai entre domaines
      if (propertiesByDomain.size > 1) {
        const interDomainDelay = Math.random() * 30000 + 15000; // 15-45 secondes
        await new Promise(resolve => setTimeout(resolve, interDomainDelay));
      }
    }
  }

  /**
   * Synchronisation prioritaire avec workload balancing
   */
  async syncPriorityPropertiesWithBalancing(): Promise<void> {
    const properties = await this.propertyModel
      .find({
        active: true,
        publicUrl: { $nin: [null, ''], $exists: true },
        syncFrequency: 1,
      })
      .sort({ lastSynced: 1, _id: 1 })
      .limit(2) // Ultra conservateur pour les prioritaires
      .lean()
      .exec();
    
    this.logger.log(`${properties.length} propriétés prioritaires à synchroniser`);

    for (const property of properties) {
      if (this.isEmergencyStopActive) {
        this.logger.warn('Arrêt d\'urgence activé - synchronisation prioritaire interrompue');
        return;
      }

      try {
        await this.syncSinglePropertyWithMetrics(property);
        
        // Délai plus court mais toujours respectueux pour les prioritaires
        const delay = Math.max(this.minDelayBetweenSyncs, 20000); // Minimum 20 secondes
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        this.logger.error(`Erreur sync prioritaire ${property._id}: ${error.message}`);
        
        // Délai d'erreur pour prioritaires
        await new Promise(resolve => setTimeout(resolve, 120000)); // 2 minutes
      }
    }
  }

  /**
   * Synchronisation d'une propriété avec collecte de métriques
   */
  private async syncSinglePropertyWithMetrics(property: any): Promise<void> {
    const domain = this.extractDomain(property.publicUrl);
    const startTime = Date.now();
    
    // Initialiser les métriques si nécessaire
    if (!this.syncMetrics.has(domain)) {
      this.syncMetrics.set(domain, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        consecutiveFailures: 0,
      });
    }
    
    const metrics = this.syncMetrics.get(domain)!;
    metrics.totalRequests++;
    
    try {
      this.logger.log(`Sync respectueuse: ${property._id} (${property.platform}: ${property.publicUrl})`);
      
      // Incrémenter le compteur de sync concurrentes
      this.currentSyncCount++;
      
      if (this.currentSyncCount > this.workloadConfig.maxConcurrentSyncs) {
        throw new Error('Limite de synchronisations concurrentes atteinte');
      }
      
      const result = await this.scraperService.scrapeCalendar(property);
      
      // Mise à jour des métriques de succès
      const responseTime = Date.now() - startTime;
      metrics.successfulRequests++;
      metrics.consecutiveFailures = 0;
      metrics.avgResponseTime = (metrics.avgResponseTime + responseTime) / 2;
      
      // Adapter le multiplicateur de délai en fonction du succès
      if (this.workloadConfig.adaptiveDelay) {
        this.dynamicDelayMultiplier = Math.max(0.8, this.dynamicDelayMultiplier * 0.95);
      }
      
      // Mettre à jour la timestamp avec métriques
      await this.propertyModel.findByIdAndUpdate(
        property._id,
        { 
          lastSynced: new Date(),
          lastSyncDuration: responseTime,
          syncSuccessful: result.success 
        },
        { new: true }
      );
      
    } catch (error) {
      // Mise à jour des métriques d'erreur
      metrics.failedRequests++;
      metrics.consecutiveFailures++;
      metrics.lastFailureTime = new Date();
      
      // Adapter le multiplicateur de délai en cas d'erreur
      if (this.workloadConfig.adaptiveDelay) {
        this.dynamicDelayMultiplier = Math.min(3, this.dynamicDelayMultiplier * this.workloadConfig.backoffMultiplier);
      }
      
      this.logger.error(`Erreur sync avec métriques ${property._id}: ${error.message}`);
      throw error;
      
    } finally {
      this.currentSyncCount--;
    }
  }

  /**
   * Déclencheur de synchronisation manuelle avec contrôles avancés
   */
  async triggerManualSync(propertyId: string, force = false): Promise<{
    success: boolean;
    message: string;
    estimatedWaitTime?: number;
  }> {
    try {
      // Vérification d'arrêt d'urgence
      if (this.isEmergencyStopActive && !force) {
        return {
          success: false,
          message: 'Arrêt d\'urgence actif - synchronisation bloquée'
        };
      }

      const property = await this.propertyModel.findOne({
        _id: propertyId,
        active: true,
      }).exec();
      
      if (!property) {
        return {
          success: false,
          message: `Propriété ${propertyId} non trouvée ou inactive`
        };
      }

      if (!property.publicUrl) {
        return {
          success: false,
          message: `Propriété ${propertyId} n'a pas d'URL publique configurée`
        };
      }
      
      // Vérification anti-spam avec calcul du temps d'attente
      const minTimeBetweenManualSync = force ? 60000 : 300000; // 1 min si forcé, 5 min sinon
      const timeSinceLastSync = property.lastSynced ? Date.now() - property.lastSynced.getTime() : Infinity;
      
      if (timeSinceLastSync < minTimeBetweenManualSync) {
        const waitTime = minTimeBetweenManualSync - timeSinceLastSync;
        return {
          success: false,
          message: `Synchronisation manuelle trop récente`,
          estimatedWaitTime: waitTime
        };
      }
      
      // Vérification de la charge du système
      if (this.currentSyncCount >= this.workloadConfig.maxConcurrentSyncs && !force) {
        return {
          success: false,
          message: 'Système surchargé - veuillez réessayer plus tard',
          estimatedWaitTime: 60000
        };
      }
      
      this.logger.log(`Synchronisation manuelle ${force ? '(forcée) ' : ''}pour ${propertyId} - URL: ${property.publicUrl}`);
      
      // Délai respectueux même pour les synchronisations manuelles
      const delay = force ? 1000 : 3000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Utiliser la méthode avec métriques
      await this.syncSinglePropertyWithMetrics(property);
      
      return {
        success: true,
        message: 'Synchronisation manuelle réussie'
      };
      
    } catch (error) {
      this.logger.error(`Erreur sync manuelle ${propertyId}: ${error.message}`);
      return {
        success: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  /**
   * Arrêt d'urgence de toutes les synchronisations
   */
  async emergencyStop(reason?: string): Promise<void> {
    this.isEmergencyStopActive = true;
    this.logger.warn(`ARRÊT D'URGENCE ACTIVÉ${reason ? `: ${reason}` : ''}`);
    
    // Attendre que les synchronisations en cours se terminent
    let waitTime = 0;
    const maxWaitTime = 60000; // 1 minute max
    
    while (this.isSyncRunning && waitTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waitTime += 1000;
    }
    
    if (this.isSyncRunning) {
      this.logger.error('Synchronisations toujours en cours après timeout - forçage de l\'arrêt');
      this.isSyncRunning = false;
    }
    
    this.logger.warn('Arrêt d\'urgence complet - toutes les synchronisations stoppées');
  }

  /**
   * Reprise après arrêt d'urgence
   */
  async resumeFromEmergencyStop(): Promise<void> {
    this.isEmergencyStopActive = false;
    this.dynamicDelayMultiplier = 2; // Reprise prudente
    this.logger.log('Reprise après arrêt d\'urgence - délais augmentés temporairement');
  }

  /**
   * Obtient le statut détaillé du système
   */
  getSyncStatus(): {
    isRunning: boolean;
    isEmergencyStopActive: boolean;
    currentSyncCount: number;
    maxConcurrentSyncs: number;
    dynamicDelayMultiplier: number;
    lastSyncDuration: number;
    metrics: Record<string, SyncMetrics>;
    lastRun?: Date;
  } {
    const lastRunValue = this.configService.get('LAST_SYNC_RUN');
    return {
      isRunning: this.isSyncRunning,
      isEmergencyStopActive: this.isEmergencyStopActive,
      currentSyncCount: this.currentSyncCount,
      maxConcurrentSyncs: this.workloadConfig.maxConcurrentSyncs,
      dynamicDelayMultiplier: this.dynamicDelayMultiplier,
      lastSyncDuration: this.lastSyncDuration,
      metrics: Object.fromEntries(this.syncMetrics),
      lastRun: lastRunValue ? new Date(lastRunValue) : undefined,
    };
  }

  // === MÉTHODES UTILITAIRES PRIVÉES ===

  private calculateAdaptiveDelay(baseDelay: number): number {
    if (!this.workloadConfig.adaptiveDelay) return baseDelay;
    return Math.floor(baseDelay * this.dynamicDelayMultiplier);
  }

  private calculateAdaptiveInterval(): number {
    // Intervalle adaptatif basé sur les métriques globales
    const totalFailures = Array.from(this.syncMetrics.values())
      .reduce((sum, metrics) => sum + metrics.failedRequests, 0);
    
    const baseInterval = 48; // heures
    const adaptiveMultiplier = Math.min(2, 1 + (totalFailures * 0.1));
    
    return Math.floor(baseInterval * adaptiveMultiplier);
  }

  private groupPropertiesByDomain(properties: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    
    for (const property of properties) {
      const domain = this.extractDomain(property.publicUrl);
      if (!grouped.has(domain)) {
        grouped.set(domain, []);
      }
      grouped.get(domain)!.push(property);
    }
    
    return grouped;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private calculateDomainSpecificDelay(domain: string): number {
    const metrics = this.syncMetrics.get(domain);
    const baseDelay = this.minDelayBetweenSyncs;
    
    if (!metrics) return baseDelay;
    
    // Délai adaptatif basé sur le taux d'échec
    const failureRate = metrics.failedRequests / Math.max(1, metrics.totalRequests);
    const delayMultiplier = 1 + (failureRate * 2) + (metrics.consecutiveFailures * 0.5);
    
    return Math.floor(baseDelay * delayMultiplier * this.dynamicDelayMultiplier);
  }

  private calculateBackoffDelay(domain: string): number {
    const metrics = this.syncMetrics.get(domain);
    if (!metrics) return 300000; // 5 minutes par défaut
    
    // Backoff exponentiel basé sur les échecs consécutifs
    const baseBackoff = 60000; // 1 minute
    const backoffDelay = baseBackoff * Math.pow(this.workloadConfig.backoffMultiplier, Math.min(metrics.consecutiveFailures, 5));
    
    return Math.min(backoffDelay, 1800000); // Max 30 minutes
  }

  private shouldTriggerCircuitBreaker(): boolean {
    if (!this.workloadConfig.circuitBreakerEnabled) return false;
    
    // Circuit breaker basé sur le taux d'échec global récent
    const recentMetrics = Array.from(this.syncMetrics.values());
    const totalRequests = recentMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalFailures = recentMetrics.reduce((sum, m) => sum + m.failedRequests, 0);
    
    if (totalRequests < 10) return false; // Pas assez de données
    
    const failureRate = totalFailures / totalRequests;
    const hasRecentFailures = recentMetrics.some(m => 
      m.lastFailureTime && (Date.now() - m.lastFailureTime.getTime()) < 300000 // 5 minutes
    );
    
    return failureRate > 0.5 && hasRecentFailures;
  }

  private handleSyncError(error: any): void {
    // Gestion centralisée des erreurs avec adaptation automatique
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      this.dynamicDelayMultiplier = Math.min(5, this.dynamicDelayMultiplier * 2);
      this.logger.warn(`Rate limit détecté - multiplicateur de délai augmenté à ${this.dynamicDelayMultiplier}`);
    } else if (error.message?.includes('blocked') || error.message?.includes('403')) {
      this.logger.error('Blocage potentiel détecté - considérer un arrêt d\'urgence temporaire');
    }
  }

  /**
   * Diagnostic du système de scraping avec recommandations intelligentes
   */
  async checkScrapingHealth(): Promise<{
    healthy: boolean;
    propertiesWithUrls: number;
    recentFailures: number;
    recommendations: string[];
    metrics: {
      globalSuccessRate: number;
      avgResponseTime: number;
      circuitBreakerActive: boolean;
      emergencyStopActive: boolean;
    };
  }> {
    try {
      const propertiesWithUrls = await this.propertyModel.countDocuments({
        active: true,
        publicUrl: { $nin: [null, ''], $exists: true },
      });

      const recommendations: string[] = [];
      const allMetrics = Array.from(this.syncMetrics.values());
      
      // Calculs de métriques globales
      const totalRequests = allMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
      const totalSuccesses = allMetrics.reduce((sum, m) => sum + m.successfulRequests, 0);
      const globalSuccessRate = totalRequests > 0 ? totalSuccesses / totalRequests : 1;
      const avgResponseTime = allMetrics.length > 0 
        ? allMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / allMetrics.length 
        : 0;

      // Recommandations intelligentes
      if (propertiesWithUrls === 0) {
        recommendations.push('❌ Aucune propriété avec URL publique configurée');
      }

      if (!this.respectfulSyncEnabled) {
        recommendations.push('⚠️ Mode de synchronisation respectueux désactivé');
      }

      if (this.minDelayBetweenSyncs < 5000) {
        recommendations.push('⚠️ Délai entre synchronisations trop court (< 5 secondes)');
      }

      if (globalSuccessRate < 0.8) {
        recommendations.push(`⚠️ Taux de succès faible (${Math.round(globalSuccessRate * 100)}%) - vérifier les sources`);
      }

      if (this.dynamicDelayMultiplier > 2) {
        recommendations.push(`⚠️ Délais adaptatifs élevés (×${this.dynamicDelayMultiplier}) - système en mode prudent`);
      }

      if (this.shouldTriggerCircuitBreaker()) {
        recommendations.push('🚨 Circuit breaker recommandé - trop d\'échecs récents');
      }

      if (avgResponseTime > 30000) {
        recommendations.push('⚠️ Temps de réponse élevé - considérer l\'optimisation');
      }

      const recentFailures = allMetrics.reduce((sum, m) => {
        const isRecent = m.lastFailureTime && (Date.now() - m.lastFailureTime.getTime()) < 3600000; // 1 heure
        return sum + (isRecent ? m.consecutiveFailures : 0);
      }, 0);

      if (recommendations.length === 0) {
        recommendations.push('✅ Système de synchronisation en bon état');
      }

      return {
        healthy: globalSuccessRate > 0.8 && !this.isEmergencyStopActive && recentFailures < 5,
        propertiesWithUrls,
        recentFailures,
        recommendations,
        metrics: {
          globalSuccessRate,
          avgResponseTime,
          circuitBreakerActive: this.shouldTriggerCircuitBreaker(),
          emergencyStopActive: this.isEmergencyStopActive,
        },
      };
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification de santé: ${error.message}`);
      return {
        healthy: false,
        propertiesWithUrls: 0,
        recentFailures: 0,
        recommendations: ['❌ Erreur lors de la vérification - système potentiellement instable'],
        metrics: {
          globalSuccessRate: 0,
          avgResponseTime: 0,
          circuitBreakerActive: false,
          emergencyStopActive: this.isEmergencyStopActive,
        },
      };
    }
  }
}