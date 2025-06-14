import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
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
  controllers: [EmailController],
  providers: [
    EmailService,
    // Don't declare HostService here since it's provided by HostModule
  ],
  exports: [EmailService],
})
export class EmailModule {}