// main.ts - Préserver le port 3003 pour TCP
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { HostModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // 1. HTTP sur le port Render (pour les health checks)
  const httpApp = await NestFactory.create(HostModule);
  const HTTP_PORT = process.env.PORT_RENDER || 10000; // Render assigne généralement un port > 10000
  
  // 2. TCP Microservice sur le port 3003 (préservé)
  const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3003, // Port fixe préservé pour vos autres services
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
      service: 'host-microservice',
      tcpPort: 3003,
      httpPort: HTTP_PORT
    });
  });

  // 5. Démarrage des services
  await httpApp.startAllMicroservices();
  await httpApp.listen(HTTP_PORT);
  
  console.log('🚀 Host microservice hybride démarré');
  console.log(`📡 HTTP Health endpoint: Port ${HTTP_PORT}`);
  console.log(`🔌 TCP Microservice: Port 3003 (préservé)`);
  console.log(`🩺 Health check: http://localhost:${HTTP_PORT}/health`);
}

bootstrap();