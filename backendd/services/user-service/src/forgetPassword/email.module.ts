import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { UserService } from '../app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schema/user.schema';
import { FirebaseAdminService } from '../firebase/firebase';
import { FirebaseClientService } from '../firebase/firebase-client.service';
import { FirebaseAuthService } from '../firebase/firebase-auth.service';
import { FirebasePassService } from '../firebase/firebase-password';
import { UserModule } from '../app.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => UserModule), // Add this to resolve circular dependency
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    FirebaseAdminService,
    FirebaseClientService,
    FirebaseAuthService,
    FirebasePassService,
  ],
  exports: [EmailService],
})
export class EmailModule {}