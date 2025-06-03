import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AdminModule } from './admin/admin.module';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement depuis le fichier .env
dotenv.config();

async function bootstrap() {
  // Créer une application microservice
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AdminModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3006,
      },
    },
  );

  // Configurer la validation globale pour les DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Démarrer le microservice
  await app.listen();
  console.log('Admin microservice is listening on TCP port 3006');
}

bootstrap();