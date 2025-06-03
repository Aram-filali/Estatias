import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MonitoringStat, MonitoringStatDocument } from '../schema/monitoring-stat.schema';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectModel(MonitoringStat.name)
    private monitoringModel: Model<MonitoringStatDocument>,
  ) {}

  async trackRequest(platform: string, success: boolean, responseTime: number, proxyUsed?: string): Promise<MonitoringStatDocument> {
    const stat = new this.monitoringModel({
      platform,
      success,
      responseTime,
      proxyUsed,
      timestamp: new Date(),
    });

    return await stat.save();
  }

  async getSuccessRate(platform: string, hours: number = 24): Promise<number> {
    const dateThreshold = new Date();
    dateThreshold.setHours(dateThreshold.getHours() - hours);

    const stats = await this.monitoringModel.find({
      platform,
      timestamp: { $gte: dateThreshold },
    }).exec();

    if (stats.length === 0) return 0;

    const successCount = stats.filter(s => s.success).length;
    return successCount / stats.length;
  }

  async getPerformanceMetrics(): Promise<{
    platforms: Record<string, { successRate: number; avgResponseTime: number }>;
    proxies: Record<string, { successRate: number; usageCount: number }>;
  }> {
    const stats = await this.monitoringModel.find().exec();

    // Analyse par plateforme
    const platforms: Record<string, { success: number; total: number; responseTime: number }> = {};

    // Analyse par proxy
    const proxies: Record<string, { success: number; total: number }> = {};

    stats.forEach(stat => {
      // Plateformes
      if (!platforms[stat.platform]) {
        platforms[stat.platform] = { success: 0, total: 0, responseTime: 0 };
      }
      platforms[stat.platform].total++;
      if (stat.success) platforms[stat.platform].success++;
      platforms[stat.platform].responseTime += stat.responseTime;

      // Proxies
      if (stat.proxyUsed) {
        if (!proxies[stat.proxyUsed]) {
          proxies[stat.proxyUsed] = { success: 0, total: 0 };
        }
        proxies[stat.proxyUsed].total++;
        if (stat.success) proxies[stat.proxyUsed].success++;
      }
    });

    // Calcul des moyennes
    const platformMetrics: Record<string, { successRate: number; avgResponseTime: number }> = {};
    Object.keys(platforms).forEach(platform => {
      platformMetrics[platform] = {
        successRate: platforms[platform].success / platforms[platform].total,
        avgResponseTime: platforms[platform].responseTime / platforms[platform].total,
      };
    });

    const proxyMetrics: Record<string, { successRate: number; usageCount: number }> = {};
    Object.keys(proxies).forEach(proxy => {
      proxyMetrics[proxy] = {
        successRate: proxies[proxy].success / proxies[proxy].total,
        usageCount: proxies[proxy].total,
      };
    });

    return {
      platforms: platformMetrics,
      proxies: proxyMetrics,
    };
  }

  /**
   * Obtient les métriques de performance avec agrégation MongoDB pour de meilleures performances
   */
  async getPerformanceMetricsOptimized(): Promise<{
    platforms: Record<string, { successRate: number; avgResponseTime: number }>;
    proxies: Record<string, { successRate: number; usageCount: number }>;
  }> {
    // Agrégation pour les plateformes
    const platformAggregation = await this.monitoringModel.aggregate([
      {
        $group: {
          _id: '$platform',
          totalRequests: { $sum: 1 },
          successfulRequests: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          totalResponseTime: { $sum: '$responseTime' }
        }
      },
      {
        $project: {
          platform: '$_id',
          successRate: { $divide: ['$successfulRequests', '$totalRequests'] },
          avgResponseTime: { $divide: ['$totalResponseTime', '$totalRequests'] }
        }
      }
    ]).exec();

    // Agrégation pour les proxies
    const proxyAggregation = await this.monitoringModel.aggregate([
      {
        $match: { proxyUsed: { $exists: true, $ne: null } }
      },
      {
        $group: {
          _id: '$proxyUsed',
          totalRequests: { $sum: 1 },
          successfulRequests: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          proxy: '$_id',
          successRate: { $divide: ['$successfulRequests', '$totalRequests'] },
          usageCount: '$totalRequests'
        }
      }
    ]).exec();

    // Transformation des résultats
    const platforms: Record<string, { successRate: number; avgResponseTime: number }> = {};
    platformAggregation.forEach(item => {
      platforms[item.platform] = {
        successRate: item.successRate,
        avgResponseTime: item.avgResponseTime
      };
    });

    const proxies: Record<string, { successRate: number; usageCount: number }> = {};
    proxyAggregation.forEach(item => {
      proxies[item.proxy] = {
        successRate: item.successRate,
        usageCount: item.usageCount
      };
    });

    return { platforms, proxies };
  }

  /**
   * Obtient les statistiques pour une période donnée
   */
  async getStatsByDateRange(startDate: Date, endDate: Date): Promise<MonitoringStatDocument[]> {
    return this.monitoringModel.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ timestamp: -1 }).exec();
  }

  /**
   * Nettoie les anciennes statistiques (plus anciennes que X jours)
   */
  async cleanOldStats(daysToKeep: number = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.monitoringModel.deleteMany({
      timestamp: { $lt: cutoffDate }
    }).exec();

    this.logger.log(`Nettoyage terminé: ${result.deletedCount} statistiques supprimées`);
    
    return { deletedCount: result.deletedCount };
  }

  /**
   * Obtient un résumé des performances récentes
   */
  async getRecentPerformanceSummary(hours: number = 24): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    platformBreakdown: Record<string, number>;
  }> {
    const dateThreshold = new Date();
    dateThreshold.setHours(dateThreshold.getHours() - hours);

    const summary = await this.monitoringModel.aggregate([
      {
        $match: { timestamp: { $gte: dateThreshold } }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          successfulRequests: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          failedRequests: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          },
          totalResponseTime: { $sum: '$responseTime' },
          platforms: { $push: '$platform' }
        }
      },
      {
        $project: {
          totalRequests: 1,
          successfulRequests: 1,
          failedRequests: 1,
          averageResponseTime: { $divide: ['$totalResponseTime', '$totalRequests'] },
          platforms: 1
        }
      }
    ]).exec();

    if (summary.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        platformBreakdown: {}
      };
    }

    // Calcul du breakdown par plateforme
    const platformBreakdown: Record<string, number> = {};
    summary[0].platforms.forEach((platform: string) => {
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
    });

    return {
      totalRequests: summary[0].totalRequests,
      successfulRequests: summary[0].successfulRequests,
      failedRequests: summary[0].failedRequests,
      averageResponseTime: summary[0].averageResponseTime,
      platformBreakdown
    };
  }
}