import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { HostService } from '../app.service';
import { HostModule } from '../app.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Host, HostSchema } from '../schema/host.schema';
import { FirebaseAdminModule } from '../firebase/firebase.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Host.name, schema: HostSchema }]),
    FirebaseAdminModule,
    forwardRef(() => HostModule), // Import HostModule to get access to HostService
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    // Don't declare HostService here since it's provided by HostModule
  ],
  exports: [NotificationService],
})
export class NotificationModule {}