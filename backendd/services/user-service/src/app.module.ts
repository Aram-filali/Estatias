import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './app.controller';
import { UserService } from './app.service';
import { DatabaseModule } from '../config/database.module';
import { FirebaseAdminModule } from './firebase/firebase.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from './forgetPassword/email.module';
import { FirebaseAdminService } from './firebase/firebase';
import { FirebasePassService } from './firebase/firebase-password';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    DatabaseModule,
    FirebaseAdminModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => EmailModule), // Use forwardRef for circular dependency
  ],
  controllers: [UserController],
  providers: [
    UserService,
    FirebaseAdminService,
    FirebasePassService,
  ],
  exports: [UserService],
})
export class UserModule {}