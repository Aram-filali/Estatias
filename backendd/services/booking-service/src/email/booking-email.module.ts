import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BookingEmailService } from './booking-email.service';
import { BookingEmailController } from './booking-email.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HOST_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.HOST_SERVICE_HOST || 'localhost',
          port: 3003,
        },
      },
      {
        name: 'PROPERTY_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.HOST_SERVICE_HOST || 'localhost',
          port: 3004,
        },
      },
    ]),
  ],
  controllers: [BookingEmailController],
  providers: [BookingEmailService],
  exports: [BookingEmailService], // Export the service so it can be used in other modules
})
export class BookingEmailModule {}