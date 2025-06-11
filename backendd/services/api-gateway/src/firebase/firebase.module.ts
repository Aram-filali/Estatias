import { Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase';  
import { FirebaseAuthGuard } from './firebase-auth.guards';  


@Module({
  providers: [FirebaseAdminService,FirebaseAuthGuard],
  exports: [FirebaseAdminService,FirebaseAuthGuard],  
})
export class FirebaseAdminModule {}