// main.ts - Property Service avec configuration hybride pour Render
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { PropertyModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // 1. HTTP sur le port Render (pour les health checks)
  const httpApp = await NestFactory.create(PropertyModule);
  const HTTP_PORT = process.env.PORT || 10000; // Port assigné par Render
     
  // 2. TCP Microservice sur le port 3004 (préservé)
  const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3004, // Port fixe préservé pour vos autres services
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

  // 4. CORS et health check
  httpApp.enableCors();
     
  // Route de santé simple pour Render
  httpApp.getHttpAdapter().get('/health', (req, res) => {
    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'property-microservice',
      tcpPort: 3004,
      httpPort: HTTP_PORT
    });
  });

  // 5. Démarrage des services
  await httpApp.startAllMicroservices();
  await httpApp.listen(HTTP_PORT);
     
  console.log('🚀 Property microservice hybride démarré');
  console.log(`📡 HTTP Health endpoint: Port ${HTTP_PORT}`);
  console.log(`🔌 TCP Microservice: Port 3004 (préservé)`);
  console.log(`🩺 Health check: http://localhost:${HTTP_PORT}/health`);
}

bootstrap();