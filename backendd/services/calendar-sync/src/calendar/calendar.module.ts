import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { Property, PropertySchema } from '../schema/property.schema';
import { Availability, AvailabilitySchema } from '../schema/availability.schema';
import { CalendarSubscription, CalendarSubscriptionSchema } from '../schema/calendar-subscription.schema';
import { SyncLog, SyncLogSchema } from '../schema/sync-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: CalendarSubscription.name, schema: CalendarSubscriptionSchema },
      { name: SyncLog.name, schema: SyncLogSchema },
    ]),
    EventEmitterModule, 
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}