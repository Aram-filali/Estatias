// src/main.ts - Configuration corrigée pour Render
import { NestFactory } from '@nestjs/core';
import { PayModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { StripeExceptionFilter } from './common/filters/stripe-exception.filter';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // 1. HTTP sur le port assigné par Render (via process.env.PORT)
  const httpApp = await NestFactory.create(PayModule);
  
  // IMPORTANT: Render assigne le port via process.env.PORT
  const HTTP_PORT = process.env.PORT || process.env.PORT_RENDER || 4002;
  
  // 2. TCP Microservice sur le port 3009 (préservé pour vos autres services)
  const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3009, // Port fixe préservé pour vos autres services
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

  // 4. Configuration des filtres d'exception
  // Uncomment si vous utilisez StripeExceptionFilter
  // microservice.useGlobalFilters(new StripeExceptionFilter());
  // httpApp.useGlobalFilters(new StripeExceptionFilter());

  // 5. CORS
  httpApp.enableCors();

  // 6. Route de santé pour Render
  httpApp.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'payment-microservice',
      tcpPort: 3009,
      httpPort: HTTP_PORT,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // 7. Route racine pour vérification
  httpApp.getHttpAdapter().get('/', (req, res) => {
    res.status(200).json({
      message: 'Payment Microservice is running',
      status: 'OK',
      ports: {
        http: HTTP_PORT,
        tcp: 3009
      }
    });
  });

  // 8. Démarrage des services
  await httpApp.startAllMicroservices();
  await httpApp.listen(HTTP_PORT, '0.0.0.0'); // Important: écouter sur toutes les interfaces

  console.log('🚀 Payment microservice hybride démarré');
  console.log(`📡 HTTP Health endpoint: Port ${HTTP_PORT}`);
  console.log(`🔌 TCP Microservice: Port 3009`);
  console.log(`🩺 Health check: http://localhost:${HTTP_PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch(err => {
  console.error('❌ Erreur lors du démarrage:', err);
  process.exit(1);
});