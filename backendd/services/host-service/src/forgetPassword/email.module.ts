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
    FirebaseAdminModule, // Importez le module au lieu de déclarer le service
    forwardRef(() => HostModule),
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    // Retirez FirebaseAdminService d'ici
  ],
  exports: [EmailService],
})
export class EmailModule {}