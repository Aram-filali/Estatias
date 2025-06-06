// main.ts - User microservice hybride pour Render
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UserModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // 1. HTTP sur le port Render (pour les health checks)
  const httpApp = await NestFactory.create(UserModule);
  const HTTP_PORT = process.env.PORT || 10000; // Port assigné par Render
     
  // 2. TCP Microservice sur le port 3005 (préservé)
  const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3005, // Port fixe préservé pour vos autres services
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
      service: 'user-microservice',
      tcpPort: 3005,
      httpPort: HTTP_PORT
    });
  });

  // 5. Démarrage des services
  await httpApp.startAllMicroservices();
  await httpApp.listen(HTTP_PORT);
     
  console.log('🚀 User microservice hybride démarré');
  console.log(`📡 HTTP Health endpoint: Port ${HTTP_PORT}`);
  console.log(`🔌 TCP Microservice: Port 3005 (préservé)`);
  console.log(`🩺 Health check: http://localhost:${HTTP_PORT}/health`);
}

bootstrap();