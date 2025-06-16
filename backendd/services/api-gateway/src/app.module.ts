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

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HOST_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },
      {
        name: 'DASHBOARD_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },
      {
        name: 'HOST_PLAN_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },
      {
        name: 'SETTINGS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },

      /*{
        name: 'PROFILE_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },*/
      {
        name: 'PROPERTY_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3004,
        },
      },
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3005,
        },
      },
      {
        name: 'ADMIN_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3006,
        },
      },
      {
        name: 'SITE_GENERATOR_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3007,
        },
      },
      {
        name: 'BOOKING_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3008,
        },
      },
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3009,
        },
      },
      {
        name: 'CALENDAR_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3010,
        },
      },
      {
        name: 'SYNC_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3010,
        },
      },
      {
        name: 'MONITORING_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3010,
        },
      },
      {
        name: 'SCRAPER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3010,
        },
      },
    ]),
    FirebaseAdminModule,
    ConfigModule.forRoot({
      isGlobal: true, // Makes environment variables available throughout the app
      envFilePath: '.env', // Path to your .env file
    }),
  ],


  controllers: [HostController, PropertyController, UserController, AdminController, SiteController, BookingController, PaymentController, ConnectController, CalSyncController, WebhookController],

})
export class AppModule {} 