// main.ts - Site Generator Service avec configuration hybride pour Render
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SiteGeneratorModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // Configuration flexible des ports avec validation
  const HTTP_PORT = parseInt(process.env.PORT || '10000', 10);
  const TCP_PORT = parseInt(process.env.TCP_PORT || '3007', 10);
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';
  
  // Validation des ports
  if (isNaN(HTTP_PORT) || HTTP_PORT < 1 || HTTP_PORT > 65535) {
    console.error('❌ Port HTTP invalide:', process.env.PORT);
    process.exit(1);
  }
  
  if (isNaN(TCP_PORT) || TCP_PORT < 1 || TCP_PORT > 65535) {
    console.error('❌ Port TCP invalide:', process.env.TCP_PORT);
    process.exit(1);
  }
  
  console.log('🔧 Configuration Site Generator Service:');
  console.log(`   - HTTP_PORT: ${HTTP_PORT}`);
  console.log(`   - TCP_PORT: ${TCP_PORT}`);
  console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - Platform: ${process.platform}`);

  // 1. Application HTTP principale pour Render
  const httpApp = await NestFactory.create(SiteGeneratorModule);
     
  // 2. TCP Microservice sur le port configuré
  const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: TCP_PORT,
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
      service: 'Site Generator Microservice',
      status: 'Running',
      version: '1.0.0',
      ports: {
        http: HTTP_PORT,
        tcp: TCP_PORT
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version
    });
  });

  httpApp.getHttpAdapter().get('/health', (req, res) => {
    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'site-generator-microservice',
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
    // Démarrer d'abord les microservices
    console.log('🚀 Démarrage des microservices...');
    await httpApp.startAllMicroservices();
    
    // Puis démarrer le serveur HTTP
    console.log('🌐 Démarrage du serveur HTTP...');
    await httpApp.listen(HTTP_PORT, '0.0.0.0');
     
    console.log('✅ Site Generator microservice démarré avec succès:');
    console.log(`   📡 HTTP Server: http://0.0.0.0:${HTTP_PORT}`);
    console.log(`   🔌 TCP Microservice: tcp://0.0.0.0:${TCP_PORT}`);
    console.log(`   🩺 Health Check: http://0.0.0.0:${HTTP_PORT}/health`);
    console.log(`   📊 Status: http://0.0.0.0:${HTTP_PORT}/tcp-status`);
    
  } catch (error) {
    console.error('❌ Erreur au démarrage du Site Generator Service:', error);
    
    // Log détaillé de l'erreur
    if (error.code === 'EADDRINUSE') {
      console.error(`🚫 Port ${error.port} déjà utilisé`);
      console.error('💡 Solutions:');
      console.error('   1. Changer le port TCP_PORT dans les variables d\'environnement');
      console.error('   2. Arrêter le processus utilisant ce port');
      console.error('   3. Utiliser un port différent pour le développement');
      console.error(`   4. Essayer: netstat -ano | findstr :${error.port}`);
    } else if (error.code === 'EACCES') {
      console.error(`🚫 Permission refusée pour le port ${TCP_PORT || HTTP_PORT}`);
      console.error('💡 Solutions:');
      console.error('   1. Utiliser un port > 1024 (ex: 8007 au lieu de 4007)');
      console.error('   2. Exécuter en tant qu\'administrateur (non recommandé)');
      console.error('   3. Changer TCP_PORT vers un port non privilégié');
      console.error(`   4. Essayer: set TCP_PORT=8007 && npm run start:dev`);
    }
    
    process.exit(1);
  }

  // 7. Gestion propre de l'arrêt
  const gracefulShutdown = async (signal) => {
    console.log(`🛑 Signal ${signal} reçu, arrêt du Site Generator Service...`);
    try {
      await httpApp.close();
      console.log('✅ Service arrêté proprement');
      process.exit(0);
    } catch (error) {
      console.error('❌ Erreur lors de l\'arrêt:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Pour Windows
  process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));
}

bootstrap().catch(error => {
  console.error('💥 Erreur fatale au bootstrap:', error);
  process.exit(1);
});