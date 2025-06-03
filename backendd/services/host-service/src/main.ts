import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { HostModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    HostModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3003,
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen();
  console.log('Host microservice is listening on TCP port 3003');
}

bootstrap();