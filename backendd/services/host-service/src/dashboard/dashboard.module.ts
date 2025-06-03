import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { HostPlanModule } from '../plan/plan.module';
import { DashboardService } from './dashboard.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Host, HostSchema } from '../schema/host.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: Host.name, schema: HostSchema }]),
    HostPlanModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  
})
export class DashboardModule {}
