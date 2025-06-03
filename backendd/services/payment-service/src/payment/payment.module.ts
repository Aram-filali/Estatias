// src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { PaymentMethod, PaymentMethodSchema } from './schemas/payment-method.schema';
import { ConnectService } from './services/connect.service';
import { ConnectController } from './controllers/connect.controller';
import { ConnectAccount, ConnectAccountSchema } from './schemas/connect-account.schema';
import { BookingPayment, BookingPaymentSchema } from './schemas/booking-payment.schema';
import { ClientsModule, Transport } from '@nestjs/microservices';



@Module({
  imports: [ 
    MongooseModule.forFeature([
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
      { name: ConnectAccount.name, schema: ConnectAccountSchema },
      { name: BookingPayment.name, schema: BookingPaymentSchema }
    ]),
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
          host: process.env.PROPERTY_SERVICE_HOST || 'localhost',
          port:  3004,
        },
        
      },
      {
        name: 'BOOKING_SERVICE',
        transport: Transport.TCP, // You can use TCP, Redis, MQTT, etc. based on your infrastructure
        options: {
          host: process.env.BOOKING_SERVICE_HOST || 'localhost',
          port:  3008,
        },
        
      },
    ]),
  ],
  controllers: [PaymentController, ConnectController],
  providers: [PaymentService, ConnectService],
  exports: [PaymentService]
})
export class PaymentModule {}