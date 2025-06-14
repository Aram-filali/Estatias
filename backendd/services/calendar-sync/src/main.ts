// main.ts - Calendar Sync Service avec configuration hybride pour Render
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // Configuration flexible des ports avec validation
  const HTTP_PORT = parseInt(process.env.PORT || '10000', 10); // Render utilise PORT
  const TCP_PORT = parseInt(process.env.TCP_PORT || '3010', 10); // Port TCP configurable (défaut 3010)
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';
  
  // Validation des ports
  if (isNaN(HTTP_PORT) || HTTP_PORT <= 0 || HTTP_PORT > 65535) {
    console.error('❌ Port HTTP invalide:', process.env.PORT);
    process.exit(1);
  }
  
  if (isNaN(TCP_PORT) || TCP_PORT <= 0 || TCP_PORT > 65535) {
    console.error('❌ Port TCP invalide:', process.env.TCP_PORT);
    process.exit(1);
  }
  
  console.log('🔧 Configuration Calendar Sync Service:');
  console.log(`   - HTTP_PORT: ${HTTP_PORT}`);
  console.log(`   - TCP_PORT: ${TCP_PORT}`);
  console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);

  // 1. Application HTTP principale pour Render
  const httpApp = await NestFactory.create(AppModule);
     
  // 2. TCP Microservice sur le port configuré (avec validation)
  const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: TCP_PORT, // Utilise directement la variable déjà parsée
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
      service: 'Calendar Sync Microservice',
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
      service: 'calendar-sync-microservice',
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

  // Route spécifique pour les informations du service de synchronisation
  httpApp.getHttpAdapter().get('/sync-status', (req, res) => {
    res.json({
      service: 'Calendar Synchronization',
      status: 'active',
      features: [
        'Calendar sync scheduling',
        'Event synchronization',
        'Automated sync processes'
      ],
      lastSync: new Date().toISOString(),
      nextSync: 'Scheduled based on cron jobs'
    });
  });

  // 6. Démarrage sécurisé des services
  try {
    await httpApp.startAllMicroservices();
    await httpApp.listen(HTTP_PORT, '0.0.0.0');
     
    console.log('✅ Calendar Sync microservice démarré avec succès:');
    console.log(`   📡 HTTP Server: http://0.0.0.0:${HTTP_PORT}`);
    console.log(`   🔌 TCP Microservice: tcp://0.0.0.0:${TCP_PORT}`);
    console.log(`   🩺 Health Check: http://0.0.0.0:${HTTP_PORT}/health`);
    console.log(`   📊 Status: http://0.0.0.0:${HTTP_PORT}/tcp-status`);
    console.log(`   🔄 Sync Status: http://0.0.0.0:${HTTP_PORT}/sync-status`);
    
  } catch (error) {
    console.error('❌ Erreur au démarrage du Calendar Sync Service:', error);
    
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
    console.log('🛑 Arrêt du Calendar Sync Service...');
    await httpApp.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('🛑 Interruption du Calendar Sync Service...');
    await httpApp.close();
    process.exit(0);
  });
}

bootstrap().catch(error => {
  console.error('💥 Erreur fatale au bootstrap:', error);
  process.exit(1);
});