import { Injectable, NotFoundException, InternalServerErrorException} from '@nestjs/common';
  import { InjectModel } from '@nestjs/mongoose';
  import { Model } from 'mongoose';
  import { Host, HostDocument } from '../schema/host.schema';
  import { DashboardDto } from '../dto/createDashboard.dto';
  import { HostPlanService } from '../plan/plan.service';
  
  @Injectable()
  export class DashboardService {
    constructor(
      @InjectModel(Host.name)
      private readonly hostModel: Model<HostDocument>,
      private readonly planService: HostPlanService,
    ) {}
  
    async getDashboardData(hostId: string): Promise<DashboardDto> {
      console.log(`[Dashboard Service] Searching for host with firebaseUid: ${hostId}`);
  
      try {
        const host = await this.hostModel.findOne({ firebaseUid: hostId }).lean().exec();
  
        if (!host) {
          console.warn(`[Dashboard Service] No host found with firebaseUid: ${hostId}`);
          throw new NotFoundException(`Host with ID ${hostId} not found.`);
        }
  
        const plan = await this.planService.getPlanByFirebaseUid(hostId);

        const dashboard: DashboardDto = {
          id: host.firebaseUid,
          email: host.email || '',
          name: host.isAgency
            ? host.businessName ?? ''
            : `${host.firstName ?? ''} ${host.lastName ?? ''}`.trim(),
          plan: plan?.plan || 'Standard',
          websiteUrl: `${host.isAgency ? host.domainName : host.domainName || 'user'}.com`
            .toLowerCase()
            .replace(/\s+/g, '-'),
          trialEndsAt: plan?.trialEndsAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          isTrialActive: plan?.isTrialActive !== undefined ? plan.isTrialActive : true,
          status: plan?.isTrialActive ? 'Trial Period' : 'Subscribed Plan', 
          revenue: 0,
          firstName: host.firstName || '',
          lastName: host.lastName || '',
          isAgency: host.isAgency || false,
          notifications: [],
          businessName: host.businessName || '',
          country: host.country || '',
          phoneNumber: host.phoneNumber || '',
        };
        
  
        console.log(`[Dashboard Service] Successfully created profile for ${dashboard.email}`);
        return dashboard;
      } catch (error) {
        console.error('[Dashboard Service] Error in getDashboardData:', error);
  
        if (error instanceof NotFoundException) {
          throw error;
        }
  
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
          console.error(`[Dashboard Service] MongoDB error: ${error.code} - ${error.message}`);
        }
  
        throw new InternalServerErrorException(
          `Failed to retrieve dashboard data: ${error.message || 'Unknown error'}`
        );
      }
    }
  }
  