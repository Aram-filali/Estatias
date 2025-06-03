import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CalendarService, ExportOptions, ConflictDetectionResult } from './calendar.service';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto';
import { PropertyDocument } from '../schema/property.schema';
import { AvailabilityDocument } from '../schema/availability.schema';
import { CalendarSubscriptionDocument } from '../schema/calendar-subscription.schema';

@Controller()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @MessagePattern('property.create')
  async createProperty(@Payload() createPropertyDto: CreatePropertyDto): Promise<PropertyDocument> {
    return this.calendarService.createProperty(createPropertyDto);
  }

  @MessagePattern('properties.findAll')
  async findAllProperties(): Promise<PropertyDocument[]> {
    return this.calendarService.findAllProperties();
  }

  @MessagePattern('property.findById')
  async findPropertyById(@Payload() id: string): Promise<PropertyDocument> {
    return this.calendarService.findPropertyById(id);
  }

  @MessagePattern('availability.update')
  async updateAvailability(@Payload() updateAvailabilityDto: UpdateAvailabilityDto): Promise<AvailabilityDocument> {
    return this.calendarService.updateAvailability(updateAvailabilityDto);
  }

  @MessagePattern('calendar.detectConflicts')
  async detectConflicts(
    @Payload() data: { propertyId: string; startDate: string; endDate: string },
  ): Promise<ConflictDetectionResult> {
    return this.calendarService.detectConflicts(
      data.propertyId,
      data.startDate,
      data.endDate,
    );
  }

  @MessagePattern('calendar.export')
  async exportCalendarData(
    @Payload() data: { propertyId: string; options?: ExportOptions },
  ): Promise<any> {
    return this.calendarService.exportCalendarData(
      data.propertyId,
      data.options || { format: 'json' },
    );
  }

  @MessagePattern('calendar.subscription.create')
  async createCalendarSubscription(
    @Payload() data: { propertyId: string; webhookUrl: string; events?: string[] },
  ): Promise<CalendarSubscriptionDocument> {
    return this.calendarService.createCalendarSubscription(
      data.propertyId,
      data.webhookUrl,
      data.events,
    );
  }

  @MessagePattern('calendar.subscription.delete')
  async deleteCalendarSubscription(@Payload() subscriptionId: string): Promise<{ message: string }> {
    await this.calendarService.deleteCalendarSubscription(subscriptionId);
    return { message: 'Abonnement supprimé avec succès' };
  }

  @MessagePattern('calendar.subscription.generateUrl')
  async generateSubscriptionUrl(@Payload() propertyId: string): Promise<{ url: string }> {
    const url = await this.calendarService.generateSubscriptionUrl(propertyId);
    return { url };
  }

  @MessagePattern('property.testUrl')
  async testPublicUrl(
    @Payload() data: { publicUrl: string; platform: string },
  ): Promise<{ valid: boolean; message: string }> {
    return this.calendarService.testPublicUrl(data.publicUrl, data.platform);
  }

  @MessagePattern('calendar.cleanup')
  async cleanupOldAvailability(
    @Payload() data: { olderThanDays?: number },
  ): Promise<{ deletedCount: number }> {
    return this.calendarService.cleanupOldAvailability(data.olderThanDays);
  }

  @MessagePattern('calendar.stats')
  async getCalendarStats(@Payload() data: { propertyId?: string }): Promise<any> {
    return this.calendarService.getCalendarStats(data.propertyId);
  }

/*  @MessagePattern('property.findByUrl')
async findPropertyByUrl(@Payload() data: { url: string; platform: string }): Promise<PropertyDocument> {
  return this.calendarService.findPropertyByUrl(data.url, data.platform);
}

@MessagePattern('property.findBySiteId')
async findPropertyBySiteId(@Payload() data: { siteId: string; platform: string }): Promise<PropertyDocument> {
  return this.calendarService.findPropertyBySiteId(data.siteId, data.platform);
}

@MessagePattern('availability.get')
async getAvailability(@Payload() data: { 
  propertyId: string; 
  startDate: string; 
  endDate: string 
}): Promise<AvailabilityDocument[]> {
  return this.calendarService.getAvailability(data.propertyId, data.startDate, data.endDate);
}*/
}