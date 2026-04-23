import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const directUri = configService.get<string>('MONGO_URL_DIRECT');
        const uri = directUri || configService.get<string>('MONGO_URL');
        if (!uri) {
          throw new Error('MONGO_URL (ou MONGO_URL_DIRECT) is not defined in environment variables');
        }

        if (directUri) {
          console.warn('⚠️ Utilisation de MONGO_URL_DIRECT (fallback sans DNS SRV).');
        }

        return {
          uri,
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}