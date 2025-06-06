// main.ts - Adaptez votre microservice pour Render Web Service GRATUIT
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { HostModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // 1. Créer l'application HTTP principale (obligatoire pour Render)
  const httpApp = await NestFactory.create(HostModule);
  
  // 2. Ajouter votre microservice TCP existant
  const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0', // Important : 0.0.0.0 pour Render
      port: 3003,
    },
  });

  // 3. Configuration des pipes (comme votre code original)
  microservice.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 4. Démarrer les deux services
  await httpApp.startAllMicroservices();
  await httpApp.listen(3003);
  
  console.log('🚀 Host microservice hybride démarré');
  console.log(`📡 HTTP Health endpoint: Port 3003`);
  console.log(`🔌 TCP Microservice: Port 3003`);
}

bootstrap();