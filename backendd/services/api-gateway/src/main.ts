import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import * as ngrok from 'ngrok';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Démarrer ngrok d'abord pour obtenir l'URL
  const ngrokUrl = await ngrok.connect({
    addr: 3000,
    authtoken: process.env.NGROK_AUTH_TOKEN, // Optionnel mais recommandé
  });
  
  console.log('Ngrok tunnel established at:', ngrokUrl);

  // Configuration CORS étendue pour inclure l'URL ngrok
  app.enableCors({
    origin: [
      'https://estatias.com',
      'https://www.estatias.com',
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002',
      'https://your-frontend.vercel.app',
      'https://your-front-p.vercel.app',
      'https://estatias-7qr38xop7-aram-filali-soumaya-ayadis-projects.vercel.app',
      ngrokUrl, // Ajouter l'URL ngrok dynamiquement
      /https:\/\/.*\.ngrok-free\.app$/, // Pattern pour tous les domaines ngrok
      /https:\/\/.*\.ngrok\.io$/, // Pattern pour anciens domaines ngrok
      /https:\/\/.*\.vercel\.app$/,
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type', 
      'Authorization',
      'ngrok-skip-browser-warning', // Header spécifique pour ngrok
      'X-Requested-With'
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  // Middleware pour gérer les headers ngrok
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Ajouter les headers CORS manuellement si nécessaire
    const origin = req.headers.origin;
    
    if (origin) {
      const allowedOrigins = [
        'https://estatias.com',
        'https://www.estatias.com',
        ngrokUrl
      ];
      
      if (allowedOrigins.includes(origin) || 
          origin.includes('.ngrok-free.app') || 
          origin.includes('.vercel.app')) {
        res.header('Access-Control-Allow-Origin', origin);
      }
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With');
    
    // Gérer les requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      res.status(204).send();
      return;
    }
    
    next();
  });

  // Apply raw body parsing middleware specifically for Stripe webhooks
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

  // Apply JSON parsing for all other routes (excluding webhook paths)
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.originalUrl && req.originalUrl.startsWith('/webhooks/stripe')) {
      next();
    } else {
      express.json({ limit: '50mb' })(req, res, next);
    }
  });

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.originalUrl && req.originalUrl.startsWith('/webhooks/stripe')) {
      next();
    } else {
      express.urlencoded({ limit: '50mb', extended: true })(req, res, next);
    }
  });

  // Port configuration
  const port = 3000;
  
  // Bind to 0.0.0.0 pour permettre les connexions externes
  await app.listen(port, '0.0.0.0');

  console.log(`API Gateway is running on port: ${port}`);
  console.log(`Ngrok tunnel available at: ${ngrokUrl}`);
  console.log(`Local server: http://localhost:${port}`);
}

bootstrap().catch(error => {
  console.error('Error starting the application:', error);
  process.exit(1);
});