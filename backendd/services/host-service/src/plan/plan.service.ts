import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HostPlan, HostPlanDocument } from '../schema/plan.schema';
import { Host, HostDocument } from '../schema/host.schema';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class HostPlanService {
  constructor(
    @InjectModel(HostPlan.name) private hostPlanModel: Model<HostPlanDocument>,
    @InjectModel(Host.name) private hostModel: Model<HostDocument>,
  ) {}

  async createPlan(data: any): Promise<any> {
    // Improve error handling to provide better feedback
    if (!data || Object.keys(data).length === 0) {
      throw new Error('No data provided for plan creation');
    }

    console.log('Received data for plan creation:', data);

    const trialPeriodDays = 14;
    const now = new Date();

    // Check if we received hostId instead of firebaseUid and handle both cases
    const firebaseUid = data.firebaseUid || data.hostId;

    if (!firebaseUid) {
      throw new Error('No firebaseUid or hostId provided');
    }

    // Handle both possible data structures for trial end date
    const trialEndsAt = data.trialEndsAt
      ? new Date(data.trialEndsAt)
      : new Date(now.getTime() + trialPeriodDays * 24 * 60 * 60 * 1000);

    const isTrialActive = trialEndsAt > now;

    // Récupérer l'hôte correspondant à firebaseUid
    const host = await this.hostModel.findOne({ firebaseUid }).exec();

    if (!host || !host.domainName) {
      throw new Error('Host not found or domain name missing');
    }

    const websiteUrl = `${host.domainName}.resa.com`;

    // Create the plan document
    const newPlan = new this.hostPlanModel({
      firebaseUid: firebaseUid,
      plan: data.plan,
      websiteUrl: websiteUrl,
      trialEndsAt,
      isTrialActive,
      isPaid: false, // New field
      paymentStatus: 'pending', // New field
      stripeCustomerId: data.stripeCustomerId || null, // Store customer ID if available
    });

    try {
      return await newPlan.save();
    } catch (error) {
      console.error('Plan creation error:', error);
      throw new Error(`Error creating subscription plan: ${error.message}`);
    }
  }

  async getPlanByFirebaseUid(firebaseUid: string): Promise<any> {
    try {
      const plan = await this.hostPlanModel.findOne({ firebaseUid }).exec();

      if (!plan) {
        console.log(`No plan found for user ${firebaseUid}`);
        return null;
      }
      
      return {
        firebaseUid: plan.firebaseUid,
        plan: plan.plan,
        websiteUrl: plan.websiteUrl,
        trialEndsAt: plan.trialEndsAt,
        isTrialActive: plan.isTrialActive,
        isPaid: plan.isPaid,
        paymentStatus: plan.paymentStatus,
        paymentDate: plan.paymentDate,
        stripeCustomerId: plan.stripeCustomerId,
        subscriptionStartDate: plan.subscriptionStartDate,
        status: this.getStatusText(plan),
      };
    } catch (error) {
      throw new Error(
        'Error retrieving plan by Firebase UID: ' + error.message,
      );
    }
  }

  private getStatusText(plan: HostPlanDocument): string {
    if (plan.isPaid) {
      return 'Active Subscription';
    } else if (plan.isTrialActive) {
      return 'Trial Period';
    } else if (plan.paymentStatus === 'failed') {
      return 'Payment Failed';
    } else if (plan.paymentStatus === 'pending') {
      return 'Payment Pending';
    } else {
      return 'Inactive';
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateTrialStatuses() {
    const now = new Date();

    const result = await this.hostPlanModel.updateMany(
      { trialEndsAt: { $lt: now }, isTrialActive: true },
      { $set: { isTrialActive: false } }
    );

    console.log(`Updated ${result.modifiedCount} host(s) from trial to active.`);
  }

  // Updated activatePlan method with payment tracking
  async activatePlan(data: { 
    hostId: string; 
    plan: string;
    paymentIntentId?: string;
    stripeCustomerId?: string;
  }): Promise<any> {
    try {
      const now = new Date();
      
      // Find the host's current plan - try both possible field names
      const hostPlan = await this.hostPlanModel.findOne({
        $or: [
          { firebaseUid: data.hostId },
          { hostId: data.hostId }
        ]
      }).exec();
      
      if (!hostPlan) {
        throw new Error('No subscription plan found for this host');
      }
      
      // Update plan with payment information
      hostPlan.isTrialActive = false;
      hostPlan.isPaid = true;
      hostPlan.paymentStatus = 'paid';
      hostPlan.paymentDate = now;
      hostPlan.subscriptionStartDate = now;
      
      if (data.paymentIntentId) {
        hostPlan.lastPaymentIntentId = data.paymentIntentId;
      }
      
      if (data.stripeCustomerId) {
        hostPlan.stripeCustomerId = data.stripeCustomerId;
      }
      
      const updatedPlan = await hostPlan.save();
      
      return {
        firebaseUid: updatedPlan.firebaseUid,
        plan: updatedPlan.plan,
        websiteUrl: updatedPlan.websiteUrl,
        trialEndsAt: updatedPlan.trialEndsAt,
        isTrialActive: updatedPlan.isTrialActive,
        isPaid: updatedPlan.isPaid,
        paymentStatus: updatedPlan.paymentStatus,
        paymentDate: updatedPlan.paymentDate,
        subscriptionStartDate: updatedPlan.subscriptionStartDate,
        status: 'Active Subscription',
      };
    } catch (error) {
      throw new Error('Error activating subscription plan: ' + error.message);
    }
  }

  // New method to update payment status
  async updatePaymentStatus(data: {
    hostId: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    paymentIntentId?: string;
    stripeCustomerId?: string;
  }): Promise<any> {
    try {
      const hostPlan = await this.hostPlanModel.findOne({
        $or: [
          { firebaseUid: data.hostId },
          { hostId: data.hostId }
        ]
      }).exec();
      
      if (!hostPlan) {
        throw new Error('No subscription plan found for this host');
      }
      
      hostPlan.paymentStatus = data.paymentStatus;
      
      if (data.paymentStatus === 'paid') {
        hostPlan.isPaid = true;
        hostPlan.paymentDate = new Date();
        hostPlan.isTrialActive = false;
        if (!hostPlan.subscriptionStartDate) {
          hostPlan.subscriptionStartDate = new Date();
        }
      } else if (data.paymentStatus === 'failed') {
        hostPlan.isPaid = false;
      }
      
      if (data.paymentIntentId) {
        hostPlan.lastPaymentIntentId = data.paymentIntentId;
      }
      
      if (data.stripeCustomerId) {
        hostPlan.stripeCustomerId = data.stripeCustomerId;
      }
      
      const updatedPlan = await hostPlan.save();
      
      return {
        firebaseUid: updatedPlan.firebaseUid,
        plan: updatedPlan.plan,
        isPaid: updatedPlan.isPaid,
        paymentStatus: updatedPlan.paymentStatus,
        paymentDate: updatedPlan.paymentDate,
        status: this.getStatusText(updatedPlan),
      };
    } catch (error) {
      throw new Error('Error updating payment status: ' + error.message);
    }
  }
}