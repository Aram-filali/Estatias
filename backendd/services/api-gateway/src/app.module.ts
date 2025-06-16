// app.module.ts - Configuration pour Render
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HostController } from './app.controller/host.controller';
import { UserController } from './app.controller/user.controller';
import { PropertyController } from './app.controller/property.controller';
import { AdminController } from './app.controller/admin.controller';
import { SiteController } from './app.controller/site.controller';
import { BookingController } from './app.controller/booking.controller';
import { PaymentController } from './app.controller/payment.controller';
import { FirebaseAdminModule } from './firebase/firebase.module';
import { ConfigModule } from '@nestjs/config';
import { ConnectController } from './app.controller/connect.controller';
import { WebhookController } from './webhooks/webhook.controller';
import { CalSyncController } from './app.controller/CalSync.controller';
import { AppController } from './app.controller';
import { TestController } from './test.controller';
import { FirebaseAuthGuard } from './firebase/firebase-auth.guards';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HOST_SERVICE',
        transport: Transport.TCP,
        options: {
          // ✅ Utiliser l'URL externe du service HOST sur Render
          host: process.env.HOST_SERVICE_URL || 'host-microservice-xyz.onrender.com', // Remplacez par votre URL Render
          port: parseInt(process.env.HOST_SERVICE_PORT || '443'), // HTTPS sur Render
        },
      },
      {
        name: 'DASHBOARD_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.DASHBOARD_SERVICE_URL || 'dashboard-microservice-xyz.onrender.com',
          port: parseInt(process.env.DASHBOARD_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'HOST_PLAN_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.HOST_PLAN_SERVICE_URL || 'host-plan-microservice-xyz.onrender.com',
          port: parseInt(process.env.HOST_PLAN_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'SETTINGS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.SETTINGS_SERVICE_URL || 'settings-microservice-xyz.onrender.com',
          port: parseInt(process.env.SETTINGS_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'PROPERTY_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.PROPERTY_SERVICE_URL || 'property-microservice-xyz.onrender.com',
          port: parseInt(process.env.PROPERTY_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.USER_SERVICE_URL || 'user-microservice-xyz.onrender.com',
          port: parseInt(process.env.USER_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'ADMIN_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.ADMIN_SERVICE_URL || 'admin-microservice-xyz.onrender.com',
          port: parseInt(process.env.ADMIN_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'SITE_GENERATOR_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.SITE_GENERATOR_SERVICE_URL || 'site-generator-microservice-xyz.onrender.com',
          port: parseInt(process.env.SITE_GENERATOR_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'BOOKING_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.BOOKING_SERVICE_URL || 'booking-microservice-xyz.onrender.com',
          port: parseInt(process.env.BOOKING_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.PAYMENT_SERVICE_URL || 'payment-microservice-xyz.onrender.com',
          port: parseInt(process.env.PAYMENT_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'CALENDAR_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.CALENDAR_SERVICE_URL || 'calendar-microservice-xyz.onrender.com',
          port: parseInt(process.env.CALENDAR_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'SYNC_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.SYNC_SERVICE_URL || 'sync-microservice-xyz.onrender.com',
          port: parseInt(process.env.SYNC_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'MONITORING_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.MONITORING_SERVICE_URL || 'monitoring-microservice-xyz.onrender.com',
          port: parseInt(process.env.MONITORING_SERVICE_PORT || '443'),
        },
      },
      {
        name: 'SCRAPER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.SCRAPER_SERVICE_URL || 'scraper-microservice-xyz.onrender.com',
          port: parseInt(process.env.SCRAPER_SERVICE_PORT || '443'),
        },
      },
    ]),
    FirebaseAdminModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [
    AppController,
    HostController, 
    PropertyController, 
    UserController, 
    AdminController, 
    SiteController, 
    BookingController, 
    PaymentController, 
    ConnectController, 
    CalSyncController, 
    WebhookController,
    TestController,
  ],
  providers: [FirebaseAuthGuard],
})
export class AppModule {}