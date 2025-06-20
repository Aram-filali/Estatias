import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncService } from './sync.service';
import { UnifiedCalendarSyncService } from './sync2.service';
import { SyncScheduler } from './sync.scheduler';
import { Property, PropertySchema } from '../schema/property.schema';
import { SyncLog, SyncLogSchema } from '../schema/sync-log.schema';
import { SyncQueue, SyncQueueSchema } from '../schema/sync-queue.schema'; // Add this import
import { ScraperModule } from '../scraper/scraper.module';
import { CalendarModule } from '../calendar/calendar.module';
import { SyncController } from './sync.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: SyncLog.name, schema: SyncLogSchema },
      { name: SyncQueue.name, schema: SyncQueueSchema }, // Add this line
    ]),
    ScraperModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}