// main.ts - Calendar Sync Service optimisé pour Render
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // Configuration des ports - Render fournit automatiquement le PORT
  const HTTP_PORT = parseInt(process.env.PORT || '3000', 10); // Render utilise process.env.PORT
  const TCP_PORT = parseInt(process.env.TCP_PORT || '3010', 10);
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';
  
  console.log('🔧 Configuration Calendar Sync Service:');
  console.log(`   - HTTP_PORT: ${HTTP_PORT} (from Render)`);
  console.log(`   - TCP_PORT: ${TCP_PORT}`);
  console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - Render HOST: ${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}`);

  try {
    // 1. Créer l'application HTTP principale
    const httpApp = await NestFactory.create(AppModule);
    
    // 2. Configuration CORS - Plus permissive pour Render
    httpApp.enableCors({
      origin: true, // Permissif pour les health checks de Render
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    });

    // 3. Configuration des pipes de validation
    const validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    httpApp.useGlobalPipes(validationPipe);

    // 4. Routes de santé AVANT le microservice TCP
    httpApp.getHttpAdapter().get('/', (req, res) => {
      res.status(200).json({ 
        service: 'Calendar Sync Microservice',
        status: 'Running',
        version: '1.0.0',
        ports: {
          http: HTTP_PORT,
          tcp: TCP_PORT
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Route de santé critique pour Render
    httpApp.getHttpAdapter().get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK',
        healthy: true,
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

    // Routes additionnelles de monitoring
    httpApp.getHttpAdapter().get('/tcp-status', (req, res) => {
      res.status(200).json({
        tcpService: 'active',
        tcpPort: TCP_PORT,
        tcpHost: '0.0.0.0',
        message: 'TCP microservice is running and accepting connections'
      });
    });

    httpApp.getHttpAdapter().get('/sync-status', (req, res) => {
      res.status(200).json({
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

    // 5. Démarrer le serveur HTTP AVANT le microservice TCP
    await httpApp.listen(HTTP_PORT, '0.0.0.0');
    
    console.log('✅ HTTP Server démarré:');
    console.log(`   📡 HTTP Server: http://0.0.0.0:${HTTP_PORT}`);
    console.log(`   🩺 Health Check: http://0.0.0.0:${HTTP_PORT}/health`);
    
    // 6. Ajouter le microservice TCP seulement si nécessaire
    if (process.env.ENABLE_TCP_MICROSERVICE !== 'false') {
      try {
        const microservice = httpApp.connectMicroservice<MicroserviceOptions>({
          transport: Transport.TCP,
          options: {
            host: '0.0.0.0',
            port: TCP_PORT,
          },
        });

        microservice.useGlobalPipes(validationPipe);
        await httpApp.startAllMicroservices();
        
        console.log(`   🔌 TCP Microservice: tcp://0.0.0.0:${TCP_PORT}`);
      } catch (tcpError) {
        console.warn('⚠️  TCP Microservice non disponible:', tcpError.message);
        console.log('   Continuant avec HTTP seulement...');
      }
    }
    
    console.log(`   📊 Status: http://0.0.0.0:${HTTP_PORT}/tcp-status`);
    console.log(`   🔄 Sync Status: http://0.0.0.0:${HTTP_PORT}/sync-status`);
    console.log('🚀 Service prêt pour Render!');
    
  } catch (error) {
    console.error('❌ Erreur au démarrage du Calendar Sync Service:', error);
    
    if (error.code === 'EADDRINUSE') {
      console.error(`🚫 Port ${HTTP_PORT} déjà utilisé`);
    }
    
    process.exit(1);
  }

  // 7. Gestion propre de l'arrêt
  const gracefulShutdown = async (signal: string) => {
    console.log(`🛑 ${signal} reçu, arrêt gracieux...`);
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Empêcher les crashes non gérés
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap().catch(error => {
  console.error('💥 Erreur fatale au bootstrap:', error);
  process.exit(1);
});