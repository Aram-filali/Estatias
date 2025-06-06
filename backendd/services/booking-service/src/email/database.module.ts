import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import  { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URL');

        if (!uri) {
          console.error('❌ MONGO_URL n\'est pas défini dans les variables d\'environnement.');
          process.exit(1); // Quitte l'application si l'URL est manquante
        }

        try {
          const mongoose = await import('mongoose');
          await mongoose.connect(uri);
          console.log('✅ Connecté à MongoDB');
        } catch (error) {
          console.error('❌ Erreur de connexion à MongoDB:', error.message);
          process.exit(1);
        }

        return { uri };
      },
    }),
  ],
})
export class DatabaseModule {}

