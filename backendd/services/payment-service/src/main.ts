// src/main.ts
import { NestFactory } from '@nestjs/core';
import { PayModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { StripeExceptionFilter } from './common/filters/stripe-exception.filter';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PayModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3009,
      },
    },
  );
  
  // Enable global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Enable global exception filter
  //app.useGlobalFilters(new StripeExceptionFilter());
  
  await app.listen();
  console.log('Payment microservice is listening on TCP port 3009');
}
bootstrap();

