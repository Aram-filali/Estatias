import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MonitoringStatDocument = MonitoringStat & Document;

@Schema({ 
  collection: 'monitoring_stats',
  timestamps: { createdAt: 'timestamp', updatedAt: false }
})
export class MonitoringStat {
  @Prop({ 
    type: String, 
    required: true, 
    maxlength: 50,
    index: true 
  })
  platform: string;

  @Prop({ type: Boolean, required: true })
  success: boolean;

  @Prop({ type: Number, required: true })
  responseTime: number; // en millisecondes

  @Prop({ 
    type: String, 
    maxlength: 255,
    index: true 
  })
  proxyUsed?: string;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ 
    type: String, 
    maxlength: 10 
  })
  httpStatus?: string;

  @Prop({ 
    type: Object,
    default: {} 
  })
  metadata?: Record<string, any>;

  // Le timestamp sera automatiquement créé par timestamps: { createdAt: 'timestamp' }
  timestamp?: Date;
}

export const MonitoringStatSchema = SchemaFactory.createForClass(MonitoringStat);

// Index composés pour optimiser les requêtes
MonitoringStatSchema.index({ platform: 1, timestamp: -1 });
MonitoringStatSchema.index({ proxyUsed: 1, timestamp: -1 });

// Index pour les requêtes de monitoring par date
MonitoringStatSchema.index({ timestamp: -1 });

// Index pour les statistiques de succès par plateforme
MonitoringStatSchema.index({ platform: 1, success: 1, timestamp: -1 });