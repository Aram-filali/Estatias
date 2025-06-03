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
        status: plan.isTrialActive ? 'Trial Period' : 'Subscribed Plan',
      };
    } catch (error) {
      throw new Error(
        'Error retrieving plan by Firebase UID: ' + error.message,
      );
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

  async activatePlan(data: { hostId: string, plan: string }): Promise<any> {
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
      
      // Update plan status
      hostPlan.isTrialActive = false;
      // You can also update other fields as needed, like payment status, billing cycle dates, etc.
      
      const updatedPlan = await hostPlan.save();
      
      return {
        firebaseUid: updatedPlan.firebaseUid,
        plan: updatedPlan.plan,
        //websiteUrl: updatedPlan.websiteUrl,
        trialEndsAt: updatedPlan.trialEndsAt,
        isTrialActive: updatedPlan.isTrialActive,
        status: 'Subscribed Plan',
      };
    } catch (error) {
      throw new Error('Error activating subscription plan: ' + error.message);
    }
  }
}