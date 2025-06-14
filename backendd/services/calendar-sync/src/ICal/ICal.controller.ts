// microservice/src/ical/ical.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ICalSyncService } from './ICal.service';
//import { AvailabilityItem } from '../schema/availability.schema';

// Définition des interfaces pour les types de retour
interface SyncPropertyCalendarResponse {
  success: boolean;
  message?: string;
  availabilities?: AvailabilityItem[];
}

interface TestICalUrlResponse {
  valid: boolean;
  message: string;
  eventCount?: number;
}
interface AvailabilityItem {
  date: string;
  isAvailable: boolean;
  price?: number;
  currency?: string;
  minStay?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

interface UpdatePropertyICalResponse {
  success: boolean;
  message: string;
  testResult?: TestICalUrlResponse;
  syncResult?: SyncPropertyCalendarResponse;
}

interface SyncAllPropertiesResponse {
  total: number;
  success: number;
  failed: number;
  error?: string;
}

@Controller()
export class ICalController {
  private readonly logger = new Logger(ICalController.name);

  constructor(private readonly icalSyncService: ICalSyncService) {}

  @MessagePattern({ cmd: 'sync_property_calendar' })
  async syncPropertyCalendar(@Payload() data: { propertyId: string }): Promise<SyncPropertyCalendarResponse> {
    this.logger.log(`📨 Réception demande sync iCal pour propriété: ${data.propertyId}`);
    
    try {
      const result = await this.icalSyncService.syncPropertyCalendar(data.propertyId);
      this.logger.log(`✅ Sync terminé pour ${data.propertyId}: ${result.success ? 'Succès' : 'Échec'}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erreur sync ${data.propertyId}: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }


  @MessagePattern({ cmd: 'test_ical_url' })
  async testICalUrl(@Payload() data: { url: string }): Promise<TestICalUrlResponse> {
    this.logger.log(`📨 Test URL iCal: ${data.url}`);
    
    try {
      const result = await this.icalSyncService.testICalUrl(data.url);
      this.logger.log(`✅ Test URL terminé: ${result.valid ? 'Valide' : 'Invalide'}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erreur test URL: ${error.message}`);
      return {
        valid: false,
        message: error.message
      };
    }
  }

  @MessagePattern({ cmd: 'sync_all_properties_ical' })
  async syncAllPropertiesWithICal(): Promise<SyncAllPropertiesResponse> {
    this.logger.log(`📨 Réception demande sync globale iCal`);
    
    try {
      const result = await this.icalSyncService.syncAllPropertiesWithICal();
      this.logger.log(`✅ Sync globale terminée: ${result.success}/${result.total} succès`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Erreur sync globale: ${error.message}`);
      return {
        total: 0,
        success: 0,
        failed: 0,
        error: error.message
      };
    }
  }

  @MessagePattern({ cmd: 'update_property_ical' })
  async updatePropertyICalUrl(@Payload() data: { propertyId: string; icalUrl: string }): Promise<UpdatePropertyICalResponse> {
    this.logger.log(`📨 Mise à jour URL iCal pour propriété: ${data.propertyId}`);
    
    try {
      // D'abord tester l'URL
      const testResult = await this.icalSyncService.testICalUrl(data.icalUrl);
      
      if (!testResult.valid) {
        return {
          success: false,
          message: `URL iCal invalide: ${testResult.message}`,
          testResult
        };
      }

      // Mise à jour de la propriété (vous devrez implémenter cette partie)
      // await this.propertyService.updateICalUrl(data.propertyId, data.icalUrl);
      
      // Puis synchroniser
      const syncResult = await this.icalSyncService.syncPropertyCalendar(data.propertyId);
      
      return {
        success: true,
        message: `URL iCal mise à jour et synchronisée. ${syncResult.message}`,
        testResult,
        syncResult
      };
      
    } catch (error: any) {
      this.logger.error(`❌ Erreur mise à jour URL iCal: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
    }
  }
}