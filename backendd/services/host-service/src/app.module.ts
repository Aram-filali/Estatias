import { Module, forwardRef } from '@nestjs/common';
import { HostService } from './app.service';
import { HostController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Host, HostSchema } from './schema/host.schema';
import { DatabaseModule } from './database.module';
import { FirebaseAdminModule } from './firebase/firebase.module';
import { HostPlanModule } from './plan/plan.module';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from './forgetPassword/email.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationModule } from './notification/notification.module'; // Add this import
import { NotificationService } from './notification/notification.service'; // Add this import
import { UpdateProfileModule } from './dashboard/settings/updateProfile.module';
import { ConfigModule } from '@nestjs/config';
import { HostPlan, HostPlanSchema } from './schema/plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Host.name, schema: HostSchema },
      { name: HostPlan.name, schema: HostPlanSchema },
    ]),
    DatabaseModule,
    FirebaseAdminModule,
    HostPlanModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => EmailModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => UpdateProfileModule), // Remove the duplicate regular import
    DashboardModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [HostController],
  providers: [HostService],
  exports: [HostService],
})
export class HostModule {}