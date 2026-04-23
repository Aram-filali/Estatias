import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const directUri = configService.get<string>('MONGO_URL_DIRECT');
        const uri = directUri || configService.get<string>('MONGO_URL');

        if (!uri) {
          console.error("❌ MONGO_URL (ou MONGO_URL_DIRECT) n'est pas défini dans les variables d'environnement.");
          process.exit(1);
        }

        if (directUri) {
          console.log('⚠️ Utilisation de MONGO_URL_DIRECT (fallback sans DNS SRV).');
        }

        return {
          uri,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('✅ Connecté à MongoDB');
            });
            connection.on('error', (error) => {
              console.error('❌ Erreur de connexion à MongoDB:', error.message);
            });
            return connection;
          }
        };
      },
    }),
  ],
})
export class DatabaseModule {}