export class DashboardDto {
    id: string;
    email: string;
    name: string;
    plan: string;
    websiteUrl: string;
    trialEndsAt: Date;
    isTrialActive: boolean;
    status: string;
    //totalBookings: number;
    //pendingBookings: number;
    revenue: number;
    notifications: Notification[];
    firstName?: string;
    lastName?: string;
    isAgency?: boolean;
    businessName?: string;
    country?: string;
    phoneNumber?: string;
  }
  
  
  export class CreateDashboardDto {
    hostId: string;
  }
  
  export class DashboardResponseDto {
    success: boolean;
    profile: DashboardDto | null;
    message?: string;
  }