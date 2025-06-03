import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BookingController } from './app.controller';
import { BookingService } from './app.service';
import { BookingSchema, Booking } from './schema/booking.schema';
import { DatabaseModule } from '../config/database.module';
import { BookingEmailModule } from './email/booking-email.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentExpirationTask } from './payment-expiration.task';



@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
    DatabaseModule,
    BookingEmailModule,
    ScheduleModule.forRoot(),
    // Configure the microservice client for communicating with host service
    ClientsModule.register([
      {
        name: 'HOST_SERVICE',
        transport: Transport.TCP, // You can use TCP, Redis, MQTT, etc. based on your infrastructure
        options: {
          host: process.env.HOST_SERVICE_HOST || 'localhost',
          port:  3003,
        },
        
      },
      {
        name: 'PROPERTY_SERVICE',
        transport: Transport.TCP, // You can use TCP, Redis, MQTT, etc. based on your infrastructure
        options: {
          host: process.env.HOST_SERVICE_HOST || 'localhost',
          port:  3004,
        },
        
      },
    ]),
  ],
  controllers: [BookingController],
  providers: [BookingService, PaymentExpirationTask],
  exports: [BookingService],
})
export class AppModule {}