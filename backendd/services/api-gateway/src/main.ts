import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

/**
 * Point d'entrée principal de l'API Gateway.
 * Ce service centralise les requêtes et les redirige vers les microservices appropriés.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuration dynamique des origines autorisées pour le CORS
  const staticAllowedOrigins = [
    'https://estatias.com',
    'https://www.estatias.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3010',
    'http://localhost:3002',
    'https://your-frontend.vercel.app',
    'https://your-front-p.vercel.app',
  ];

  const envAllowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  const localhostPattern = /^http:\/\/([a-zA-Z0-9-]+\.)?localhost(?::\d+)?$/;
  const vercelPattern = /^https:\/\/.*\.vercel\.app$/;

  // Configuration CORS robuste pour supporter le développement local et les déploiements Vercel
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowed =
        staticAllowedOrigins.includes(origin) ||
        envAllowedOrigins.includes(origin) ||
        localhostPattern.test(origin) ||
        vercelPattern.test(origin);

      callback(isAllowed ? null : new Error(`Not allowed by CORS: ${origin}`), isAllowed);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  /**
   * Middleware spécifique pour Stripe :
   * Les webhooks Stripe nécessitent le corps brut (raw body) de la requête pour la vérification de signature.
   */
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

  // Parsing JSON standard pour toutes les autres routes
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

  // Utilisation d'un port fixe pour la Gateway (exposé en production)
  const port =  3000;
  
  await app.listen(port);
  
  console.log(`API Gateway is running on: ${process.env.NODE_ENV === 'production' ? `Port ${port}` : `http://localhost:${port}`}`);
}

bootstrap();