import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HostPlan, HostPlanSchema } from '../schema/plan.schema';
import { Host, HostSchema } from '../schema/host.schema';
import { HostPlanController } from './plan.controller';
import { HostPlanService } from './plan.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: HostPlan.name, schema: HostPlanSchema }]),
  MongooseModule.forFeature([{ name: Host.name, schema: HostSchema }])],
  controllers: [HostPlanController],
  providers: [HostPlanService],
  exports: [HostPlanService],
})
export class HostPlanModule {}
