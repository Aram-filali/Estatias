import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DashboardService } from './dashboard.service';
import { DashboardResponseDto } from '../dto/createDashboard.dto';

@Controller()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @MessagePattern({ cmd: 'get_host_dashboard' })
  async getDashboardData(@Payload() payload: { hostId: string }) {
    console.log(`[Dashboard Service] Received request with payload:`, payload);
    
    if (!payload || !payload.hostId) {
      console.error(`[Dashboard Service] Invalid payload - missing hostId`);
      return {
        success: false,
        statusCode: 400,
        error: 'hostId is required'
      };
    }
    
    try {
      console.log(`[Dashboard Service] Fetching dashboard for hostId: ${payload.hostId}`);
      const profile = await this.dashboardService.getDashboardData(payload.hostId);
      console.log(`[Dashboard Service] Found profile:`, JSON.stringify(profile));
      
      return {
        success: true,
        statusCode: 200,
        data: {
          profile
        }
      };
    } catch (error) {
      console.error(`[Dashboard Service] Error:`, error);
      return {
        success: false,
        statusCode: error.status || 500,
        error: error.message || 'Failed to get dashboard data'
      };
    }
  }
}
