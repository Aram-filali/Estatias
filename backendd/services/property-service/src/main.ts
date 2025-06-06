// main.ts - Property Service avec configuration hybride pour Render
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { PropertyModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // Configuration flexible des ports
  const HTTP_PORT = process.env.PORT || 10000; // Render utilise PORT, pas PORT_RENDER
  const TCP_PORT = process.env.TCP_PORT || 3004; // Port TCP configurable (défaut 3004)
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';
  
  console.log('🔧 Configuration Property Service:');
  console.log(`   - HTTP_PORT: ${HTTP_PORT}`);
  console.log(`   - TCP_PORT: ${TCP_PORT}`);
  console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);

  // 1. Application HTTP principale pour Render
  const httpApp = await NestFactory.create(PropertyModule);
     
  // 2. TCP Microservice sur le port configuré
  const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: parseInt(TCP_PORT.toString()),
    },
  });

  // 3. Configuration des pipes de validation
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  microservice.useGlobalPipes(validationPipe);
  httpApp.useGlobalPipes(validationPipe);

  // 4. Configuration HTTP et CORS
  httpApp.enableCors({
    origin: IS_PRODUCTION ? false : true, // Plus restrictif en production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
     
  // 5. Routes de santé et informations
  httpApp.getHttpAdapter().get('/', (req, res) => {
    res.json({ 
      service: 'Property Microservice',
      status: 'Running',
      version: '1.0.0',
      ports: {
        http: HTTP_PORT,
        tcp: TCP_PORT
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  httpApp.getHttpAdapter().get('/health', (req, res) => {
    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'property-microservice',
      ports: {
        tcp: TCP_PORT,
        http: HTTP_PORT
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      uptime: Math.round(process.uptime())
    });
  });

  // Route pour tester la connectivité TCP
  httpApp.getHttpAdapter().get('/tcp-status', (req, res) => {
    res.json({
      tcpService: 'active',
      tcpPort: TCP_PORT,
      tcpHost: '0.0.0.0',
      message: 'TCP microservice is running and accepting connections'
    });
  });

  // 6. Démarrage sécurisé des services
  try {
    await httpApp.startAllMicroservices();
    await httpApp.listen(HTTP_PORT, '0.0.0.0');
     
    console.log('✅ Property microservice démarré avec succès:');
    console.log(`   📡 HTTP Server: http://0.0.0.0:${HTTP_PORT}`);
    console.log(`   🔌 TCP Microservice: tcp://0.0.0.0:${TCP_PORT}`);
    console.log(`   🩺 Health Check: http://0.0.0.0:${HTTP_PORT}/health`);
    console.log(`   📊 Status: http://0.0.0.0:${HTTP_PORT}/tcp-status`);
    
  } catch (error) {
    console.error('❌ Erreur au démarrage du Property Service:', error);
    
    // Log détaillé de l'erreur
    if (error.code === 'EADDRINUSE') {
      console.error(`🚫 Port ${error.port} déjà utilisé`);
      console.error('💡 Solutions:');
      console.error('   1. Changer le port TCP_PORT dans les variables d\'environnement');
      console.error('   2. Arrêter le processus utilisant ce port');
      console.error('   3. Utiliser un port différent pour le développement');
    }
    
    process.exit(1);
  }

  // 7. Gestion propre de l'arrêt
  process.on('SIGTERM', async () => {
    console.log('🛑 Arrêt du Property Service...');
    await httpApp.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('🛑 Interruption du Property Service...');
    await httpApp.close();
    process.exit(0);
  });
}

bootstrap().catch(error => {
  console.error('💥 Erreur fatale au bootstrap:', error);
  process.exit(1);
});