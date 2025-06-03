import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteGeneratorService } from './app.service';
import { SiteGeneratorController } from './app.controller';
import { Host, HostSchema } from './schema/host.schema';
import { Property, PropertySchema } from './schema/property.schema';
import { SiteInfo, SiteInfoSchema } from './schema/site-info.schema';
import { ProxyManagerService } from './proxy/proxyManager.service';
import { ProxyIntegrationService } from './proxy/proxyIntegration.service';
import { DatabaseModule } from '../config/database.module'; // Make sure to import DatabaseModule

@Module({
  imports: [
    // Import DatabaseModule first to ensure connections are available
    DatabaseModule,
    
    // Models for the default connection
    MongooseModule.forFeature([
      { name: Host.name, schema: HostSchema },
      { name: SiteInfo.name, schema: SiteInfoSchema }
    ]),
    
    // Models for the second connection - use 'secondDB' consistently
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema }
    ], 'secondDB'),
  ],
  controllers: [SiteGeneratorController],
  providers: [SiteGeneratorService, ProxyManagerService, ProxyIntegrationService],
  exports: [SiteGeneratorService, ProxyManagerService]
})
export class SiteGeneratorModule {}


/*import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SiteGeneratorModule } from './site-generator/site-generator.module';
import { ProxyIntegrationService } from './site-generator/proxy-integration.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_SECONDARY_URI'),
      }),
      connectionName: 'secondDB',
    }),
    SiteGeneratorModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ProxyIntegrationService // Ajouter le service d'intégration du proxy ici
  ],
})
export class AppModule {}*/