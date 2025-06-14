import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Host, HostSchema } from '../../schema/host.schema';
import { HostPlan, HostPlanSchema } from '../../schema/plan.schema'; // Add HostPlan import
import { UpdateProfileController } from './updateProfile.controller';
import { UpdateProfileService } from './updateProfile.service';
import { FirebaseAdminService } from '../../firebase/firebase';
import { HostService } from '../../app.service';
import { HostModule } from '../../app.module';
import { EmailModule } from '../../forgetPassword/email.module';
import { NotificationModule } from '../../notification/notification.module'; // Adjust path as needed
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    forwardRef(() => HostModule), // Use forwardRef to resolve circular dependency
    forwardRef(() => NotificationModule),
    MongooseModule.forFeature([
      { name: Host.name, schema: HostSchema },
      { name: HostPlan.name, schema: HostPlanSchema }, // Add HostPlan schema
    ]),
    forwardRef(() => EmailModule), // This was already correct
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [UpdateProfileController],
  providers: [
    UpdateProfileService,
    FirebaseAdminService,
    HostService,
  ],
  exports: [UpdateProfileService],
})
export class UpdateProfileModule {}