import * as nodemailer from 'nodemailer';
import { config } from 'dotenv';
import { HostService } from '../app.service';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Model } from 'mongoose';
import { Host, HostDocument } from '../schema/host.schema';
import { InjectModel } from '@nestjs/mongoose';

config();

@Injectable()
export class NotificationService {
  private transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly logger = new Logger(NotificationService.name);
  private readonly dashboardUrl: string;

  constructor(
    @InjectModel(Host.name) private readonly hostModel: Model<HostDocument>,
    @Inject(forwardRef(() => HostService)) private hostService: HostService,
  ) {
    console.log("Notification service setup with:", {
      user: process.env.GMAIL_USER,
      passwordExists: !!process.env.GMAIL_APP_PASSWORD,
      passwordLength: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.length : 0
    });

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      debug: false
    });

    this.transporter.verify(function(error, success) {
      if (error) {
        console.log("SMTP connection error:", error);
      } else {
        console.log("SMTP server is ready for notifications");
      }
    });

    this.fromEmail = process.env.GMAIL_USER || 'your-email@gmail.com';
    this.fromName = process.env.FROM_NAME || 'Your Application';
    this.dashboardUrl = process.env.DASHBOARD_URL || 'https://yourdomain.com';
  }

  async sendStatusUpdateEmail(hostId: string, newStatus: string) {
    try {
      // Find the host by ID
      const host = await this.hostModel.findById(hostId).exec();
      
      if (!host) {
        console.log(`Host not found with ID: ${hostId}`);
        return false;
      }

      const hostEmail = host.email;
      const hostName = 'Dear Host';

      let subject: string;
      let emailContent: { text: string; html: string };

      switch (newStatus.toLowerCase()) {
        case 'approved':
          subject = '🎉 Your Website Has Been Approved!';
          emailContent = this.getApprovedEmailContent(hostName);
          break;
        case 'rejected':
          subject = '❌ Website Application Update';
          emailContent = this.getRejectedEmailContent(hostName);
          break;
        case 'suspended':
          subject = '⚠️ Website Status Update - Action Required';
          emailContent = this.getSuspendedEmailContent(hostName);
          break;
        default:
          console.log(`Unknown status: ${newStatus}`);
          return false;
      }

      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: hostEmail,
        subject: subject,
        text: emailContent.text,
        html: emailContent.html
      });

      console.log(`📩 Status update email sent successfully to ${hostEmail}:`, info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending status update email:', {
        name: error.name,
        code: error.code,
        message: error.message,
        responseCode: error.responseCode,
        response: error.response
      });
      throw new Error('Error sending status update email: ' + JSON.stringify({code: error.code, message: error.message}));
    }
  }

  private getApprovedEmailContent(hostName: string): { text: string; html: string } {
    const text = `
      Hello ${hostName},

      Congratulations! Your website creation request has been approved.

      You can now access your Website and start managing your website.

      Dashboard: ${this.dashboardUrl}

      If you have any questions, please don't hesitate to contact our support team.

      Best regards,
      The Support Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">🎉 Congratulations!</h1>
          <h2 style="color: #4a4a4a; margin-top: 0;">Your Website Has Been Approved</h2>
        </div>
        
        <p>Hello <strong>${hostName}</strong>,</p>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Great news!</strong> Your website creation request has been approved.</p>
        </div>
        
        <p>You can now access your dashboard and start managing your website:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.dashboardUrl}" style="background-color: #28a745; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Website</a>
        </div>
        
        <p>If you have any questions or need assistance getting started, please don't hesitate to contact our support team.</p>
        
        <p>Welcome aboard!</p>
        
        <p style="margin-top: 30px;">Best regards,<br><strong>The Support Team</strong></p>
      </div>
    `;

    return { text: text.trim(), html };
  }

  private getRejectedEmailContent(hostName: string): { text: string; html: string } {
    const text = `
      Hello ${hostName},

      We regret to inform you that your website creation request has been rejected.

      Our team has reviewed your application and unfortunately, it does not meet our current requirements.

      If you believe this decision was made in error or if you have questions about the rejection, please contact our support team for more information.

      You may reapply in the future once you've addressed any issues.

      Best regards,
      The Support Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc3545; margin-bottom: 10px;">❌ Application Update</h1>
          <h2 style="color: #4a4a4a; margin-top: 0;">Website Creation Request</h2>
        </div>
        
        <p>Hello <strong>${hostName}</strong>,</p>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;">We regret to inform you that your website creation request has been <strong>rejected</strong>.</p>
        </div>
        
        <p>Our team has reviewed your application and unfortunately, it does not meet our current requirements.</p>
        
        <p>If you believe this decision was made in error or if you have questions about the rejection, please contact our support team for more information.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${this.fromEmail}" style="background-color: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Contact Support</a>
        </div>
        
        <p>You may reapply in the future once you've addressed any issues.</p>
        
        <p style="margin-top: 30px;">Best regards,<br><strong>The Support Team</strong></p>
      </div>
    `;

    return { text: text.trim(), html };
  }

  private getSuspendedEmailContent(hostName: string): { text: string; html: string } {
    const text = `
      Hello ${hostName},

      This is to notify you that your website has been suspended.

      Your website is temporarily unavailable. This action may have been taken due to policy violations or other issues that require immediate attention.

      Please contact our support team as soon as possible to resolve this matter and restore your website.

      

      We appreciate your prompt attention to this matter.

      Best regards,
      The Support Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fd7e14; margin-bottom: 10px;">⚠️ Important Notice</h1>
          <h2 style="color: #4a4a4a; margin-top: 0;">Website Status Update</h2>
        </div>
        
        <p>Hello <strong>${hostName}</strong>,</p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Important:</strong> Your website has been <strong>suspended</strong>.</p>
        </div>
        
        <p>Your website is temporarily unavailable. This action may have been taken due to policy violations or other issues that require immediate attention.</p>
        
        <p><strong>Next Steps:</strong></p>
        <ul style="margin-left: 20px;">
          <li>Contact our support team immediately</li>
          <li>Review our terms of service</li>
          <li>Address any outstanding issues</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${this.fromEmail}" style="background-color: #fd7e14; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Contact Support</a>
          
        </div>
        
        <p>We appreciate your prompt attention to this matter and look forward to resolving this issue quickly.</p>
        
        <p style="margin-top: 30px;">Best regards,<br><strong>The Support Team</strong></p>
      </div>
    `;

    return { text: text.trim(), html };
  }
}