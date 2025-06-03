import { Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase'; 

@Module({
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService],  
})
export class FirebaseAdminModule {}
