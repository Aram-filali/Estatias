// main.ts - Configuration corrigée pour Render
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // 1. HTTP sur le port assigné par Render (via process.env.PORT)
  const httpApp = await NestFactory.create(AppModule);
  
  // IMPORTANT: Render assigne le port via process.env.PORT
  const HTTP_PORT = process.env.PORT || process.env.PORT_RENDER || 4000;
  
  // 2. TCP Microservice sur le port 3008 (préservé pour vos autres services)
  const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3008, // Port fixe préservé pour vos autres services
    },
  });

  // 3. Configuration des pipes
  microservice.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  httpApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 4. CORS
  httpApp.enableCors();

  // 5. Route de santé pour Render
  httpApp.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'booking-microservice',
      tcpPort: 3008,
      httpPort: HTTP_PORT,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // 6. Route racine pour vérification
  httpApp.getHttpAdapter().get('/', (req, res) => {
    res.status(200).json({
      message: 'Booking Microservice is running',
      status: 'OK',
      ports: {
        http: HTTP_PORT,
        tcp: 3008
      }
    });
  });

  // 7. Démarrage des services
  await httpApp.startAllMicroservices();
  await httpApp.listen(HTTP_PORT, '0.0.0.0'); // Important: écouter sur toutes les interfaces

  console.log('🚀 Booking microservice hybride démarré');
  console.log(`📡 HTTP Health endpoint: Port ${HTTP_PORT}`);
  console.log(`🔌 TCP Microservice: Port 3008 (préservé)`);
  console.log(`🩺 Health check: http://localhost:${HTTP_PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch(err => {
  console.error('❌ Erreur lors du démarrage:', err);
  process.exit(1);
});