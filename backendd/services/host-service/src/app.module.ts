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
import { UpdateProfileModule } from './dashboard/settings/updateProfile.module';
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Host.name, schema: HostSchema }]),
    DatabaseModule,
    FirebaseAdminModule, // Importez le module, pas le service directement
    HostPlanModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => EmailModule),
    DashboardModule,
    UpdateProfileModule,
      ConfigModule.forRoot({
      isGlobal: true, // Rend ConfigModule disponible partout
    }),
  ],
  controllers: [HostController],
  providers: [HostService], // Retirez FirebaseAdminService d'ici
  exports: [HostService],
})
export class HostModule {}
