import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseAdminService } from './firebase';

@Module({
  imports: [ConfigModule],
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService], // Exportez le service pour qu'il soit utilisable par d'autres modules
})
export class FirebaseAdminModule {}