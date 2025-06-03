import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Host, HostSchema } from '../../schema/host.schema';
import { UpdateProfileController } from './updateProfile.controller';
import { UpdateProfileService } from './updateProfile.service';
import { FirebaseAdminService } from '../../firebase/firebase';
import { HostService } from '../../app.service';
import { EmailModule } from '../../forgetPassword/email.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Host.name, schema: HostSchema }]),
    forwardRef(() => EmailModule), // Import EmailModule with forwardRef to resolve circular dependency
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [UpdateProfileController],
  providers: [
    UpdateProfileService,
    FirebaseAdminService,
    HostService, // Include HostService in providers
  ],
  exports: [UpdateProfileService],
})
export class UpdateProfileModule {}