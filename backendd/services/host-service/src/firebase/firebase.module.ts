import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseAdminService } from './firebase';

@Module({
  imports: [ConfigModule], 
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class FirebaseAdminModule {}