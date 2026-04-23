import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(), // Charger les variables d'environnement
    
    // Connexion à la première base de données
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const directUri = configService.get<string>('MONGO_URL1_DIRECT');
        const uri = directUri || configService.get<string>('MONGO_URL1');
        if (!uri) {
          console.error("❌ MONGO_URL1 (ou MONGO_URL1_DIRECT) n'est pas défini dans les variables d'environnement.");
          process.exit(1);
        }

        if (directUri) {
          console.log('⚠️ Utilisation de MONGO_URL1_DIRECT (fallback sans DNS SRV).');
        }
        
        return {
          uri,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('✅ Connecté à MongoDB (Host)');
            });
            connection.on('error', (error) => {
              console.error('❌ Erreur de connexion à MongoDB (Host):', error.message);
            });
            return connection;
          }
        };
      },
    }),

    // Connexion à la deuxième base de données
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      connectionName: 'secondDB', // Nom pour différencier les connexions
      useFactory: async (configService: ConfigService) => {
        const directUriSecond = configService.get<string>('MONGO_URL2_DIRECT');
        const uriSecond = directUriSecond || configService.get<string>('MONGO_URL2');
        if (!uriSecond) {
          console.error("❌ MONGO_URL2 (ou MONGO_URL2_DIRECT) n'est pas défini dans les variables d'environnement.");
          process.exit(1);
        }

        if (directUriSecond) {
          console.log('⚠️ Utilisation de MONGO_URL2_DIRECT (fallback sans DNS SRV).');
        }
        
        return {
          uri: uriSecond,
          connectionFactory: (connection) => {
            connection.on('connected', () => {
              console.log('✅ Connecté à MongoDB (Property)');
            });
            connection.on('error', (error) => {
              console.error('❌ Erreur de connexion à MongoDB (Property):', error.message);
            });
            return connection;
          }
        };
      },
    }),
  ],
})
export class DatabaseModule {}