import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { HostService } from '../app.service';
import { HostModule } from '../app.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Host, HostSchema } from '../schema/host.schema';
import { FirebaseAdminService } from '../firebase/firebase';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Host.name, schema: HostSchema }]),
    forwardRef(() => HostModule), // Use forwardRef for circular dependency
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    FirebaseAdminService,
  ],
  exports: [EmailService],
})
export class EmailModule {}