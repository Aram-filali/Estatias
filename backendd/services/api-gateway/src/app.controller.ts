// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  @Get()
  getHello(): string {
    return 'API Gateway is running!';
  }

  @Get()
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'api-gateway'
    };
  }
}