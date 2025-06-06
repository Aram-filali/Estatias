import { Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase';  
import { FirebaseAuthService } from './firebase-auth.service';
import { FirebaseClientService } from './firebase-client.service';
import { FirebasePassService } from './firebase-password';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { User, UserSchema } from '../schema/user.schema'; // ou ajuste le chemin si nécessaire



@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConfigModule
  ],
  providers: [FirebaseAdminService, FirebaseClientService, FirebaseAuthService, FirebasePassService],
  exports: [FirebaseAdminService, FirebaseClientService, FirebaseAuthService, FirebasePassService],
})
export class FirebaseAdminModule {}
