import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ConfigService } from './config.service';

@Global() // Add this decorator to make the module global
@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: ['.env', '.env.development', '.env.production'],
      isGlobal: true,
    }),
  ], 
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}