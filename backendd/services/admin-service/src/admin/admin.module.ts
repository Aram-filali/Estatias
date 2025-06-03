import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Admin, AdminSchema } from '../schema/admin.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../config/database.module';
import { FirebaseAdminModule } from '../firebase-auth/firebase.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    DatabaseModule,
    FirebaseAdminModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
