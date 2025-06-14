import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuration CORS pour production
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002', 
      'https://your-frontend.vercel.app',
      'https://your-front-p.vercel.app',
      /https:\/\/.*\.vercel\.app$/,  // Sites générés dynamiquement
      ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
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

  // Port configuration pour Render (IMPORTANT!)
  const port = process.env.PORT || 3000;
  
  // Bind to 0.0.0.0 pour Render (TRÈS IMPORTANT!)
  await app.listen(port, '0.0.0.0');
  
  console.log(`API Gateway is running on: ${process.env.NODE_ENV === 'production' ? `Port ${port}` : `http://localhost:${port}`}`);
}

bootstrap();