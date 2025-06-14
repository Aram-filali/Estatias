import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ICalSyncService } from './ICal.service';
import { Property, PropertySchema } from '../schema/property.schema';
import { SyncLog, SyncLogSchema } from '../schema/sync-log.schema';
import { SyncQueue, SyncQueueSchema } from '../schema/sync-queue.schema';
import { Availability, AvailabilitySchema } from '../schema/availability.schema'; // Add this import
import { ScraperModule } from '../scraper/scraper.module';
import { CalendarModule } from '../calendar/calendar.module';
import { ICalController } from './ICal.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: SyncLog.name, schema: SyncLogSchema },
      { name: SyncQueue.name, schema: SyncQueueSchema },
      { name: Availability.name, schema: AvailabilitySchema }, // Add this line
    ]),
    ScraperModule,
    CalendarModule,
  ],
  controllers: [ICalController],
  providers: [ICalSyncService],
  exports: [ICalSyncService],
})
export class ICalModule {}