/*import { Prop,Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DashboardDocument = Dashboard & Document;

export interface Notification {
  id: number;
  text: string;
  isRead: boolean;
  date: string;
  type?: 'booking' | 'system' | 'payment';
  actionUrl?: string;
}

export class Dashboard {
  @Prop({ required: true })
  firebaseUid: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  name: string;

  @Prop({ type: Array, default: [] })
  notifications: Notification[];

  // ⬇️ Partie "plan"
  @Prop()
  plan: string;

  @Prop()
  trialEndsAt: Date;

  @Prop()
  isTrialActive: boolean;

  // ⬇️ Partie "Host"
  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  isAgency?: boolean;

  @Prop()
  businessName?: string;

  @Prop()
  country?: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  propertiesCount?: number;

  @Prop()
  role?: string;

  @Prop()
  kbisOrId?: string;

  @Prop()
  hasRepresentative?: boolean;

  @Prop()
  proxy?: string;

  @Prop()
  repId?: string;

  @Prop()
  businessId?: string;

  @Prop()
  headOffice?: string;

  @Prop()
  address?: string;

  @Prop({ default: 0 })
  revenue: number;

  @Prop()
  websiteUrl: string;
}


export const DashboardSchema = SchemaFactory.createForClass(Dashboard);
*/
