import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ScraperService } from './scraper.service';
import { BrowserService } from './browser.service';
import { CaptchaService } from './captcha.service';
import { ProxyService } from './proxy.service';
import { TrialAutomationService } from './proxy-automation.service';
import { MonitoringService } from './monotoring.service';
import { TempEmailService } from './temp-email.service';
import { Property, PropertySchema } from '../schema/property.schema';
import { SyncLog, SyncLogSchema } from '../schema/sync-log.schema';
import { Availability, AvailabilitySchema } from '../schema/availability.schema';
import { MonitoringStat, MonitoringStatSchema } from '../schema/monitoring-stat.schema';
import { ScraperController } from './scraper.controller';
import { TrialAutomationController } from './proxy-automation.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
      { name: SyncLog.name, schema: SyncLogSchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: MonitoringStat.name, schema: MonitoringStatSchema },
    ]),
  ],
  controllers: [ScraperController, TrialAutomationController, ],
  providers: [
    ScraperService,
    BrowserService,
    CaptchaService,
    ProxyService,
    TrialAutomationService,
    MonitoringService,
    TempEmailService,
  ],
  exports: [
    ScraperService, 
    ProxyService, 
    TempEmailService,
    MonitoringService, 
    BrowserService, 
    CaptchaService,
    TrialAutomationService
  ],
})
export class ScraperModule {}