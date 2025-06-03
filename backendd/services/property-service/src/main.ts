import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { PropertyModule } from './app.module';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement depuis le fichier .env
dotenv.config();

async function bootstrap() {
  // 1. Créer une application microservice
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PropertyModule,
    {
      transport: Transport.TCP, // Utiliser TCP comme protocole de transport
      options: {
        host: 'localhost',
        port: 3004, // Port pour le property-service (assurez-vous qu'il n'y a pas de conflit avec d'autres services)
      },
    },
  );

  // 2. Configurer la validation globale pour les DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 3. Démarrer le microservice
  await app.listen();
  console.log('Property microservice is listening on port 3004');
}

bootstrap();