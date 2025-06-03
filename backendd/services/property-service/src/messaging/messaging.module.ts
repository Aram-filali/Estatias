// src/messaging/messaging.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport, ClientProviderOptions } from '@nestjs/microservices';

const hostServiceClientOptions: ClientProviderOptions = {
  name: 'HOST_SERVICE',
  transport: Transport.TCP,              // ou RMQ, Kafka, selon ton infra
  options: { host: 'localhost', port: 3003 }, // adresse du host-service
};

const propertyServiceClientOptions: ClientProviderOptions = {
  name: 'PROPERTY_SERVICE',
  transport: Transport.TCP,              // ou RMQ, Kafka, selon ton infra
  options: { host: 'localhost', port: 3008 }, // adresse du host-service
};

@Module({
  imports: [
    ClientsModule.register([hostServiceClientOptions , propertyServiceClientOptions,]),
  ],
  exports: [ClientsModule],
})
export class MessagingModule {}
