import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppService } from './app.service';
import { DatabaseModule } from '../config/database.module';
import { ConfigModule } from './config/config.module'; // Import your custom ConfigModule

// Modules
import { CalendarModule } from './calendar/calendar.module';
import { ScraperModule } from './scraper/scraper.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // Configuration globale (NestJS built-in)
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Your custom ConfigModule
    ConfigModule,
    
    // Planificateur de tâches
    ScheduleModule.forRoot(),
    
    // Base de données
    DatabaseModule,
    
    // Modules métier
    CalendarModule,
    ScraperModule,
    SyncModule,
  ],
  providers: [AppService],
})
export class AppModule {}