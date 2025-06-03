import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HostPlanService } from './plan.service';

@Controller()
export class HostPlanController {
  constructor(private readonly hostPlanService: HostPlanService) {}

  @MessagePattern('create_plan')
  async createPlan(@Payload() data: any) {
    console.log('Received in message handler:', data);
    
    // Ensure we have data to work with
    if (!data || Object.keys(data).length === 0) {
      throw new Error('Empty data object received');
    }
    
    return this.hostPlanService.createPlan(data);
  }

  @MessagePattern('get_plan_by_firebase_uid')
  async getPlanByFirebaseUid(@Payload() data: { firebaseUid: string }) {
    return this.hostPlanService.getPlanByFirebaseUid(data.firebaseUid);
  }

  @MessagePattern('activate_plan')
  async activatePlan(@Payload() data: { hostId: string; plan: string }) {
    return this.hostPlanService.activatePlan(data);
  }
}