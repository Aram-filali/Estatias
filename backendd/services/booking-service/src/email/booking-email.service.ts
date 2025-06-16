import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as PDFDocument from 'pdfkit';
import { config } from 'dotenv';
import { lastValueFrom } from 'rxjs';

// Load environment variables
config();

@Injectable()
export class BookingEmailService {
  private transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly logger = new Logger(BookingEmailService.name);

  constructor(
    @Inject('PROPERTY_SERVICE') private propertyServiceClient: ClientProxy,
    @Inject('HOST_SERVICE') private hostServiceClient: ClientProxy
  ) {
    this.logger.log('Initializing BookingEmailService');
    
    // Log configuration details for debugging
    this.logger.debug("Email configuration setup with:", {
      user: process.env.GMAIL_USER,
      passwordExists: !!process.env.GMAIL_APP_PASSWORD,
      passwordLength: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.length : 0
    });
  
    // Create the email transporter
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, 
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      debug: true
      //debug: process.env.NODE_ENV !== 'production' 
    });
  
    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error("SMTP connection error:", error);
      } else {
        this.logger.log("SMTP server is ready to take messages");
      }
    });
  
    this.fromEmail = process.env.GMAIL_USER || 'your-email@gmail.com';
    this.fromName = process.env.FROM_NAME || 'Your Booking Service';
  }

  /**
   * Send a booking confirmation email to the guest
   */
  async sendBookingSubmissionEmail(booking: any): Promise<boolean> {
    const { customer, propertyId, checkInDate, checkOutDate, nights, guests, pricing, id } = booking;
    const to = customer.email;
    
    if (!to) {
      this.logger.error('No email address provided for booking confirmation');
      return false;
    }

    try {

      const [property] = await Promise.all([
        this.getPropertyDetails(propertyId),
      ]);
      // Convert dates to readable format
      const formattedCheckIn = new Date(checkInDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const formattedCheckOut = new Date(checkOutDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: `Your booking request has been received #${id}`,
        text: this.getPlainTextEmail(booking, property, formattedCheckIn, formattedCheckOut),
        html: this.getHtmlEmail(booking, property, formattedCheckIn, formattedCheckOut)
      });
      
      this.logger.log(`📩 Booking confirmation email sent successfully to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Error sending booking confirmation email:', error);
      throw new Error(`Error sending booking confirmation email: ${error.message}`);
    }
  }

  /**
   * Get plain text version of the email
   */
  private getPlainTextEmail(booking: any, property: any, formattedCheckIn: string, formattedCheckOut: string): string {
    const { customer, propertyId, nights, guests, pricing, id } = booking;
    
    return `
      Booking Request Received #${id}
      
      Dear ${customer.fullName},
      
      Thank you for your booking request! Here's a summary of your reservation details:
      
      BOOKING DETAILS:
      Property ID: ${property.title}
      Check-in: ${formattedCheckIn}
      Check-out: ${formattedCheckOut}
      Number of nights: ${nights}
      
      GUESTS:
      Adults: ${guests.adults}
      Children: ${guests.children || 0}
      Infants: ${guests.infants || 0}
      
      PRICING:
      Subtotal: $${pricing.subtotal.toFixed(2)}
      Service Charge: $${pricing.serviceCharge.toFixed(2)}
      Tax: $${pricing.taxAmount.toFixed(2)}
      Total: $${pricing.total.toFixed(2)}
      
      IMPORTANT:
      Your booking is currently pending host approval. You will receive another email once the host confirms your reservation, with instructions to proceed with payment.
      
      If you have any questions or need assistance, please don't hesitate to contact our support team.
      
      Thank you for choosing our service!
      
      Best regards,
      The Support Team
    `;
  }

  /**
   * Get HTML version of the email
   */
  private getHtmlEmail(booking: any, property: any, formattedCheckIn: string, formattedCheckOut: string): string {
    const { customer, propertyId, nights, guests, pricing, id } = booking;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
        <div style="text-align: center; background-color: rgb(10, 7, 35); color: white; padding: 15px; border-radius: 4px;">
          <h1 style="margin: 0;">Booking Request Received</h1>
          <p style="margin: 5px 0 0;">Ref: #${id}</p>
        </div>
        
        <div style="padding: 20px 0;">
          <p>Dear <strong>${customer.fullName}</strong>,</p>
          
          <p>Thank you for your booking request! Here's a summary of your reservation details:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
            <p><strong>Property ID:</strong> ${property.title}</p>
            <p><strong>Check-in:</strong> ${formattedCheckIn}</p>
            <p><strong>Check-out:</strong> ${formattedCheckOut}</p>
            <p><strong>Number of nights:</strong> ${nights}</p>
            
            <h3 style="color: #333;">Guests</h3>
            <p><strong>Adults:</strong> ${guests.adults}</p>
            <p><strong>Children:</strong> ${guests.children || 0}</p>
            <p><strong>Infants:</strong> ${guests.infants || 0}</p>
            
            <h3 style="color: #333;">Pricing</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td>Subtotal</td>
                <td style="text-align: right;">$${pricing.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Service Charge</td>
                <td style="text-align: right;">$${pricing.serviceCharge.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax</td>
                <td style="text-align: right;">$${pricing.taxAmount.toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td>Total</td>
                <td style="text-align: right;">$${pricing.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div style="border-left: 4px solid #FFC107; padding: 10px; background-color: #FFF8E1; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> Your booking is currently <span style="color: #FF9800; font-weight: bold;">pending host approval</span>. You will receive another email once the host confirms your reservation, with instructions to proceed with payment.</p>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Thank you for choosing our service!</p>
          
          <p>Best regards,<br>The Support Team</p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e4e4e4; color: #777; font-size: 12px;">
          <p>This is an automated email, please do not reply directly to this message.</p>
        </div>
      </div>
    `;
  }

  /**
   * For testing email delivery
   */
  async testEmailDelivery(testEmail: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: testEmail,
        subject: 'Test Email - Booking System',
        text: `This is a test email to verify that the booking email system works correctly.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4a4a4a;">Email Delivery Test</h2>
            <p>Hello,</p>
            <p>This is a test email to verify that the booking email system works correctly.</p>
            <p>If you receive this email, it means the system is working properly.</p>
            <p>Thank you,<br>The Support Team</p>
          </div>
        `
      });
      
      this.logger.log('📩 Test email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error('❌ Error while sending the test email:', error);
      throw new Error('Error sending test email: ' + error.message);
    }
  }


  /**
 * Send a booking approved email to the guest with payment link
 */
async sendBookingApprovedEmail(booking: any): Promise<boolean> {
  const { customer, propertyId, checkInDate, checkOutDate, nights, guests, pricing, id } = booking;
  const to = customer.email;
  
  if (!to) {
    this.logger.error('No email address provided for booking approval');
    return false;
  }
  
  try {
    // Convert dates to readable format
    const formattedCheckIn = new Date(checkInDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedCheckOut = new Date(checkOutDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Generate payment link (you would replace this with your actual payment link generation)
    const paymentLink = `${process.env.FRONTEND_URL || 'https://yourdomain.com'}/payments/booking/${booking.id}`;
    //const paymentLink = `${process.env.FRONTEND_URL || 'https://yourdomain.com'}/test/${booking.id}`;
    const info = await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: to,
      subject: `Your Booking Request Has Been Approved! #${id}`,
      text: this.getApprovedPlainTextEmail(booking, formattedCheckIn, formattedCheckOut, paymentLink),
      html: this.getApprovedHtmlEmail(booking, formattedCheckIn, formattedCheckOut, paymentLink)
    });
    
    this.logger.log(`📩 Booking approval email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    this.logger.error('❌ Error sending booking approval email:', error);
    throw new Error(`Error sending booking approval email: ${error.message}`);
  }
}

/**
 * Send a booking rejected email to the guest
 */
async sendBookingRejectedEmail(booking: any): Promise<boolean> {
  const { customer, propertyId, checkInDate, checkOutDate, nights, guests, pricing, id } = booking;
  const to = customer.email;
  
  if (!to) {
    this.logger.error('No email address provided for booking rejection');
    return false;
  }
  
  try {
    // Convert dates to readable format
    const formattedCheckIn = new Date(checkInDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedCheckOut = new Date(checkOutDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Generate search link for alternative properties
    const searchLink = `${process.env.FRONTEND_URL || 'https://yourdomain.com'}/search`;
    
    const info = await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: to,
      subject: `Update on Your Booking Request #${id}`,
      text: this.getRejectedPlainTextEmail(booking, formattedCheckIn, formattedCheckOut, searchLink),
      html: this.getRejectedHtmlEmail(booking, formattedCheckIn, formattedCheckOut, searchLink)
    });
    
    this.logger.log(`📩 Booking rejection email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    this.logger.error('❌ Error sending booking rejection email:', error);
    throw new Error(`Error sending booking rejection email: ${error.message}`);
  }
}

/**
 * Generate plain text content for approved booking email
 */
private getApprovedPlainTextEmail(booking: any, checkIn: string, checkOut: string, paymentLink: string): string {
  return `
Dear ${booking.customer.fullName},

Great news! Your booking request has been approved!

BOOKING DETAILS:
Booking ID: ${booking.id}
Check-in: ${checkIn}
Check-out: ${checkOut}
Number of nights: ${booking.nights}
Guests: ${booking.guests.adults} adults, ${booking.guests.children} children, ${booking.guests.infants} infants

PRICING:
Subtotal: $${booking.pricing.subtotal.toFixed(2)}
Service Charge: $${booking.pricing.serviceCharge.toFixed(2)}
Tax: $${booking.pricing.taxAmount.toFixed(2)}
Total Amount: $${booking.pricing.total.toFixed(2)}

IMPORTANT: To confirm your reservation, please complete your payment by clicking the link below:
${paymentLink}

Please note that your reservation is not final until payment is received. The payment link will expire in 24 hours.

If you have any questions or need assistance, please don't hesitate to contact us.

Thank you for choosing our accommodation service!

Best regards,
The ${this.fromName} Team
${this.fromEmail}
`;
}

/**
 * Generate HTML content for approved booking email
 */
private getApprovedHtmlEmail(booking: any, checkIn: string, checkOut: string, paymentLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Approved</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4CAF50;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      border: 1px solid #ddd;
      border-top: none;
      padding: 20px;
      border-radius: 0 0 5px 5px;
    }
    .details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .button {
      background-color:#4CAF50;
      color:white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      display: inline-block;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #777;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Booking Approved!</h1>
  </div>
  <div class="content">
    <p>Dear ${booking.customer.fullName},</p>
    
    <p>Great news! Your booking request has been <strong>approved</strong>!</p>
    
    <div class="details">
      <h3>Booking Details:</h3>
      <p><strong>Booking ID:</strong> ${booking.id}</p>
      <p><strong>Check-in:</strong> ${checkIn}</p>
      <p><strong>Check-out:</strong> ${checkOut}</p>
      <p><strong>Number of nights:</strong> ${booking.nights}</p>
      <p><strong>Guests:</strong> ${booking.guests.adults} adults, ${booking.guests.children} children, ${booking.guests.infants} infants</p>
    </div>
    
    <div class="details">
      <h3>Pricing:</h3>
      <p><strong>Subtotal:</strong> $${booking.pricing.subtotal.toFixed(2)}</p>
      <p><strong>Service Charge:</strong> $${booking.pricing.serviceCharge.toFixed(2)}</p>
      <p><strong>Tax:</strong> $${booking.pricing.taxAmount.toFixed(2)}</p>
      <p><strong>Total Amount:</strong> $${booking.pricing.total.toFixed(2)}</p>
    </div>
    
    <p><strong>IMPORTANT:</strong> To confirm your reservation, please complete your payment by clicking the button below:</p>
    
    <div style="text-align: center;">
      <a href="${paymentLink}" class="button">Complete Payment Now</a>
    </div>
    
    <p><em>Please note that your reservation is not final until payment is received. The payment link will expire in 24 hours.</em></p>
    
    <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
    
    <p>Thank you for choosing our accommodation service!</p>
    
    <p>Best regards,<br>
    The ${this.fromName} Team<br>
    ${this.fromEmail}</p>
    
    <div class="footer">
      <p>This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Generate plain text content for rejected booking email
 */
private getRejectedPlainTextEmail(booking: any, checkIn: string, checkOut: string, searchLink: string): string {
  return `
Dear ${booking.customer.fullName},

Thank you for your interest in booking our property.

We regret to inform you that your booking request for the following dates could not be accommodated:

BOOKING DETAILS:
Booking ID: ${booking.id}
Check-in: ${checkIn}
Check-out: ${checkOut}
Number of nights: ${booking.nights}
Guests: ${booking.guests.adults} adults, ${booking.guests.children} children, ${booking.guests.infants} infants

Unfortunately, the host was unable to accept your booking for these dates. This could be due to a variety of reasons including availability changes or maintenance requirements.

We invite you to explore our other available properties that might suit your needs:
${searchLink}

We appreciate your understanding and hope to have the opportunity to host you in the future.

If you have any questions or need assistance with finding alternative accommodations, please don't hesitate to contact us.

Thank you for your interest in our service.

Best regards,
The ${this.fromName} Team
${this.fromEmail}
`;
}

/**
 * Generate HTML content for rejected booking email
 */
private getRejectedHtmlEmail(booking: any, checkIn: string, checkOut: string, searchLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Status Update</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #607D8B;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      border: 1px solid #ddd;
      border-top: none;
      padding: 20px;
      border-radius: 0 0 5px 5px;
    }
    .details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .button {
      background-color:rgb(243, 245, 246);
      color: #f9f9f9;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      display: inline-block;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #777;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Booking Status Update</h1>
  </div>
  <div class="content">
    <p>Dear ${booking.customer.fullName},</p>
    
    <p>Thank you for your interest in booking our property.</p>
    
    <p>We regret to inform you that your booking request for the following dates could not be accommodated:</p>
    
    <div class="details">
      <h3>Booking Details:</h3>
      <p><strong>Booking ID:</strong> ${booking.id}</p>
      <p><strong>Check-in:</strong> ${checkIn}</p>
      <p><strong>Check-out:</strong> ${checkOut}</p>
      <p><strong>Number of nights:</strong> ${booking.nights}</p>
      <p><strong>Guests:</strong> ${booking.guests.adults} adults, ${booking.guests.children} children, ${booking.guests.infants} infants</p>
    </div>
    
    <p>Unfortunately, the host was unable to accept your booking for these dates. This could be due to a variety of reasons including availability changes or maintenance requirements.</p>
    
    <p>We invite you to explore our other available properties that might suit your needs:</p>
    
    <div style="text-align: center;">
      <a href="${searchLink}" class="button">Find Alternative Accommodations</a>
    </div>
    
    <p>We appreciate your understanding and hope to have the opportunity to host you in the future.</p>
    
    <p>If you have any questions or need assistance with finding alternative accommodations, please don't hesitate to contact us.</p>
    
    <p>Thank you for your interest in our service.</p>
    
    <p>Best regards,<br>
    The ${this.fromName} Team<br>
    ${this.fromEmail}</p>
    
    <div class="footer">
      <p>This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;
}




/**
 * Send an email notifying that a booking was rejected due to payment expiration
 */
  async sendBookingExpiredEmail(booking: any): Promise<boolean> {
    const { customer, propertyId, checkInDate, checkOutDate, nights, guests, pricing, id } = booking;
    const to = customer.email;
    
    if (!to) {
      this.logger.error('No email address provided for payment expiration notification');
      return false;
    }
    
    try {
      // Convert dates to readable format
      const formattedCheckIn = new Date(checkInDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const formattedCheckOut = new Date(checkOutDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Generate search link for alternative properties
      const searchLink = `${process.env.FRONTEND_URL || 'https://yourdomain.com'}/search`;
      
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: `Booking Canceled: Payment Deadline Expired for Booking #${id}`,
        text: this.getExpiredPaymentPlainTextEmail(booking, formattedCheckIn, formattedCheckOut, searchLink),
        html: this.getExpiredPaymentHtmlEmail(booking, formattedCheckIn, formattedCheckOut, searchLink)
      });
      
      this.logger.log(`📩 Payment expiration email sent successfully to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Error sending payment expiration email:', error);
      throw new Error(`Error sending payment expiration email: ${error.message}`);
    }
  } 

  /**
   * Generate plain text content for payment expiration email
   */
  private getExpiredPaymentPlainTextEmail(booking: any, checkIn: string, checkOut: string, searchLink: string): string {
    return `
      Dear ${booking.customer.fullName},

      BOOKING PAYMENT DEADLINE EXPIRED

      We're writing to inform you that your booking (#${booking.id}) has been automatically canceled because the payment deadline has passed.

      BOOKING DETAILS:
      Booking ID: ${booking.id}
      Check-in: ${checkIn}
      Check-out: ${checkOut}
      Number of nights: ${booking.nights}
      Guests: ${booking.guests.adults} adults, ${booking.guests.children || 0} children, ${booking.guests.infants || 0} infants

      PRICING (UNPAID):
      Subtotal: $${booking.pricing.subtotal.toFixed(2)}
      Service Charge: $${booking.pricing.serviceCharge.toFixed(2)}
      Tax: $${booking.pricing.taxAmount.toFixed(2)}
      Total Amount: $${booking.pricing.total.toFixed(2)}

      After your booking was approved, you had 48 hours to complete the payment. Since the payment deadline has expired, the property is now available for other guests to book.

      If you're still interested in staying at one of our properties for your planned dates, you can browse other available accommodations here:
      ${searchLink}

      We apologize for any inconvenience this may have caused and hope to welcome you as our guest in the future.

      If you believe this cancellation was made in error or if you have any questions, please contact our customer support team immediately.

      Thank you for your understanding.

      Best regards,
      The ${this.fromName} Team
      ${this.fromEmail}
      `;
  }

  /**
   * Generate HTML content for payment expiration email
   */
  private getExpiredPaymentHtmlEmail(booking: any, checkIn: string, checkOut: string, searchLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Canceled: Payment Deadline Expired</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #F44336;
            color: white;
            padding: 15px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            border: 1px solid #ddd;
            border-top: none;
            padding: 20px;
            border-radius: 0 0 5px 5px;
          }
          .details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .button {
            background-color: #2196F3;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin: 20px 0;
            font-weight: bold;
          }
          .notice {
            border-left: 4px solid #F44336;
            background-color: #FFEBEE;
            padding: 15px;
            margin: 15px 0;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Booking Canceled</h1>
          <p>Payment Deadline Expired</p>
        </div>
        <div class="content">
          <p>Dear ${booking.customer.fullName},</p>
          
          <div class="notice">
            <p>We're writing to inform you that your booking (#${booking.id}) has been <strong>automatically canceled</strong> because the payment deadline has passed.</p>
          </div>
          
          <div class="details">
            <h3>Booking Details:</h3>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Check-in:</strong> ${checkIn}</p>
            <p><strong>Check-out:</strong> ${checkOut}</p>
            <p><strong>Number of nights:</strong> ${booking.nights}</p>
            <p><strong>Guests:</strong> ${booking.guests.adults} adults, ${booking.guests.children || 0} children, ${booking.guests.infants || 0} infants</p>
          </div>
          
          <div class="details">
            <h3>Pricing (Unpaid):</h3>
            <p><strong>Subtotal:</strong> $${booking.pricing.subtotal.toFixed(2)}</p>
            <p><strong>Service Charge:</strong> $${booking.pricing.serviceCharge.toFixed(2)}</p>
            <p><strong>Tax:</strong> $${booking.pricing.taxAmount.toFixed(2)}</p>
            <p><strong>Total Amount:</strong> $${booking.pricing.total.toFixed(2)}</p>
          </div>
          
          <p>After your booking was approved, you had 48 hours to complete the payment. Since the payment deadline has expired, the property is now available for other guests to book.</p>
          
          <p>If you're still interested in staying at one of our properties for your planned dates, you can browse other available accommodations:</p>
          
          <div style="text-align: center;">
            <a href="${searchLink}" class="button">Find Available Properties</a>
          </div>
          
          <p>We apologize for any inconvenience this may have caused and hope to welcome you as our guest in the future.</p>
          
          <p>If you believe this cancellation was made in error or if you have any questions, please contact our customer support team immediately.</p>
          
          <p>Thank you for your understanding.</p>
          
          <p>Best regards,<br>
          The ${this.fromName} Team<br>
          ${this.fromEmail}</p>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
      `;
  }

  /**
   * Fetch property details from property microservice
   */
  private async getPropertyDetails(propertyId: string): Promise<any> {
    try {
      this.logger.log(`Fetching property details for ID: ${propertyId}`);
      const response = await lastValueFrom(
        this.propertyServiceClient.send(
          { cmd: 'get_property_by_id' },
          { id: propertyId }
        )
      );
      
      if (response.statusCode !== 200 || !response.data) {
        throw new Error(`Failed to fetch property: ${response.error || 'Unknown error'}`);
      }
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching property details: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Fetch host details from host microservice
   */
  private async getHostDetails(firebaseUid: string): Promise<any> {
    try {
      this.logger.log(`Fetching host details for ID: ${firebaseUid}`);
      const response = await lastValueFrom(
        this.hostServiceClient.send(
          { cmd: 'get-host-by-firebase-id' },
          firebaseUid
        )
      );
      
      if (response.statusCode !== 200 || !response.data) {
        throw new Error(`Failed to fetch host: ${response.error || 'Unknown error'}`);
      }
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching host details: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate a PDF attachment with booking details
   */
  private async generateBookingPDF(booking: any, property: any, host: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF with better margins for a professional look
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: `Booking Confirmation #${booking.id}`,
          Author: property.title,
          Subject: 'Accommodation Booking Confirmation'
        }
      });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Define colors and styling constants
      const primaryColor = '#336699';
      const secondaryColor = '#666666';
      const highlightColor = '#e74c3c';
      
      // Helper function for section headers
      const addSectionHeader = (text: string) => {
        doc.moveDown(1);
        doc.fontSize(16).fillColor(primaryColor).text(text, { underline: false });
        // Add a line under the section header
        doc.moveDown(0.2);
        doc.moveTo(50, doc.y)
          .lineTo(doc.page.width - 50, doc.y)
          .lineWidth(1)
          .stroke(primaryColor);
        doc.moveDown(0.5);
        doc.fillColor('black');
      };
      
      // Add company branding
      // Option for logo: doc.image('path/to/logo.png', 50, 50, { width: 120 });
      doc.fontSize(24).fillColor(primaryColor).text(property.title.toUpperCase(), { align: 'center' });
      doc.moveDown(0.2);
      
      // Title
      doc.fontSize(18).fillColor(primaryColor).text('BOOKING CONFIRMATION', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(secondaryColor).text(`Reference: #${booking.id}`, { align: 'center' });
      
      // Add a horizontal line
      doc.moveDown(1);
      doc.moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .lineWidth(1)
        .stroke('#cccccc');
      
      // Two-column layout for Customer and Property
      const startY = doc.y + 20;
      const midPoint = doc.page.width / 2;
      
      // Left column - Customer details
      doc.fontSize(14).fillColor(primaryColor).text('Customer Details', 50, startY);
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('black');
      doc.text(`Name: ${booking.customer.fullName}`);
      doc.text(`Email: ${booking.customer.email}`);
      doc.text(`Phone: ${booking.customer.phone}`);
      if (booking.customer.message) {
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor(secondaryColor).text('Message:');
        doc.fontSize(10).fillColor('black').text(`${booking.customer.message}`, { width: midPoint - 70 });
      }
      
      // Right column - Property details
      doc.fontSize(14).fillColor(primaryColor).text('Property Details', midPoint, startY);
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('black');
      doc.text(`Type: ${property.type}`, midPoint, doc.y);
      doc.text(`Address: ${property.address}`);
      doc.text(`${property.city}, ${property.country}`);
      doc.moveDown(0.5);
      doc.text(`${property.bedrooms} Bedrooms • ${property.bathrooms} Bathrooms`);
      doc.text(`Maximum Guests: ${property.maxGuest}`);
      
      // Reset position for next section
      doc.x = 50;
      doc.moveDown(2);
      
      // Booking details
      addSectionHeader('Booking Details');
      
      // Format dates
      const formattedCheckIn = new Date(booking.checkInDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const formattedCheckOut = new Date(booking.checkOutDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Two columns for dates
      const dateY = doc.y;
      doc.fontSize(11);
      
      // Left column - Check-in
      doc.fontSize(12).fillColor(primaryColor).text('CHECK-IN', 50, dateY);
      doc.fontSize(14).fillColor('black').text(formattedCheckIn.split(',')[0], { width: midPoint - 70 });
      doc.fontSize(11).text(formattedCheckIn.split(',').slice(1).join(',').trim());
      
      // Right column - Check-out
      doc.fontSize(12).fillColor(primaryColor).text('CHECK-OUT', midPoint, dateY);
      doc.fontSize(14).fillColor('black').text(formattedCheckOut.split(',')[0], { width: midPoint - 70 });
      doc.fontSize(11).text(formattedCheckOut.split(',').slice(1).join(',').trim());
      
      // Guest info and stay duration
      doc.x = 50;
      doc.moveDown(1.5);
      
      const guestY = doc.y;
      
      // Left column - Guest information
      doc.fontSize(11).fillColor(secondaryColor).text('GUEST INFORMATION', 50, guestY);
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('black');
      doc.text(`Adults: ${booking.guests.adults}`);
      doc.text(`Children: ${booking.guests.children || 0}`);
      doc.text(`Infants: ${booking.guests.infants || 0}`);
      
      // Right column - Stay information
      doc.fontSize(11).fillColor(secondaryColor).text('STAY INFORMATION', midPoint, guestY);
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('black');
      doc.text(`Total Nights: ${booking.nights}`, midPoint, doc.y);
      doc.text(`Status: ${booking.status.toUpperCase()}`);
      doc.text(`Payment Method: ${booking.paymentMethod}`);
      
      // Reset position for next section
      doc.x = 50;
      doc.moveDown(2);
      
      // Direct Payment Policy - Highlighted section with box
      const policyY = doc.y;
      doc.rect(50, policyY, doc.page.width - 100, 80).fillAndStroke('#f9f2f4', '#e74c3c');
      doc.fontSize(14).fillColor(highlightColor).text('DIRECT PAYMENT POLICY', 70, policyY + 15, { width: doc.page.width - 140 });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#333333').text('Direct payments should be made on the day of check-in. For greater flexibility, guests are encouraged to discuss and agree on alternative arrangements directly with the property owner.', { width: doc.page.width - 140 });
      
      // Reset position for next section
      doc.x = 50;
      doc.y = policyY + 100;
      
      // Pricing details in a table-like format
      addSectionHeader('Pricing Details');
      
      const tableTop = doc.y;
      const tableWidth = 250;
      doc.fontSize(11);
      
      // Draw pricing table
      doc.font('Helvetica').text('Description', 50, tableTop);
      doc.text('Amount', 50 + tableWidth, tableTop, { align: 'right' });
      
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y)
        .lineTo(50 + tableWidth + 100, doc.y)
        .lineWidth(0.5)
        .stroke('#cccccc');
      doc.moveDown(0.5);
      
      // Table rows
      doc.text('Accommodation Subtotal', 50);
      doc.text(`$${booking.pricing.subtotal.toFixed(2)}`, 50 + tableWidth, doc.y, { align: 'right' });
      doc.moveDown(0.5);
      
      doc.text('Service Charge', 50);
      doc.text(`$${booking.pricing.serviceCharge.toFixed(2)}`, 50 + tableWidth, doc.y, { align: 'right' });
      doc.moveDown(0.5);
      
      doc.text('Tax', 50);
      doc.text(`$${booking.pricing.taxAmount.toFixed(2)}`, 50 + tableWidth, doc.y, { align: 'right' });
      doc.moveDown(0.5);
      
      // Total line with emphasis
      doc.moveTo(50, doc.y)
        .lineTo(50 + tableWidth + 100, doc.y)
        .lineWidth(0.5)
        .stroke('#cccccc');
      doc.moveDown(0.5);
      
      doc.fontSize(12).fillColor(primaryColor).text('TOTAL', 50);
      doc.fontSize(14).fillColor(primaryColor).text(`$${booking.pricing.total.toFixed(2)}`, 50 + tableWidth, doc.y, { align: 'right' });
      
      // Host details
      doc.x = 50;
      doc.moveDown(2);
      addSectionHeader('Host Information');
      
      doc.fontSize(11).fillColor('black');
      if (host.isAgency) {
        doc.text(`Agency: ${host.businessName}`);
        doc.text(`Business ID: ${host.businessId}`);
        doc.text(`Head Office: ${host.headOffice}`);
      } else {
        doc.text(`Name: ${host.firstName} ${host.lastName}`);
      }
      doc.text(`Email: ${host.email}`);
      doc.text(`Phone: ${host.phoneNumber}`);
      doc.text(`Country: ${host.country}`);
      
      // Property policies if available
      if (property.policies) {
        doc.moveDown(1);
        addSectionHeader('Property Policies');
        
        doc.fontSize(11).fillColor('black');
        
        if (property.policies.check_in_start && property.policies.check_in_end) {
          doc.text(`Check-in Time: ${property.policies.check_in_start} - ${property.policies.check_in_end}`);
        }
        
        if (property.policies.check_out_start && property.policies.check_out_end) {
          doc.text(`Check-out Time: ${property.policies.check_out_start} - ${property.policies.check_out_end}`);
        }
        
        // Add some space between policy items
        doc.moveDown(0.5);
        
        // Create a clean list of amenities/policies with icons (using bullet points as placeholders)
        const policies = [
          { name: 'Smoking', allowed: property.policies.smoking },
          { name: 'Pets', allowed: property.policies.pets },
          { name: 'Events/Parties', allowed: property.policies.parties_or_events }
        ];
        
        policies.forEach(policy => {
          doc.text(`• ${policy.name}: ${policy.allowed ? 'Allowed' : 'Not Allowed'}`);
        });
      }
      
      // Footer with confirmation date and thank you message
      doc.moveDown(2);
      
      // Add a decorative line before footer
      doc.moveTo(150, doc.y)
        .lineTo(doc.page.width - 150, doc.y)
        .lineWidth(0.5)
        .stroke('#cccccc');
      doc.moveDown(1);
      
      doc.fontSize(10).fillColor(secondaryColor).text(`Payment confirmed on: ${new Date(booking.confirmationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, { align: 'center', italic: true });
      
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(primaryColor).text('Thank you for your booking!', { align: 'center' });
      
      // Add a simple page number at the bottom
      doc.fontSize(8).fillColor(secondaryColor).text(
        `Page ${doc.page.pageNumber}`,
        50,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 100 }
      );
      
      doc.end();
    } catch (error) {
      this.logger.error(`Error generating PDF: ${error.message}`, error.stack);
      reject(error);
    }
  });
}

  /**
   * Send a booking confirmation email to the guest
   */
  async sendBookingConfirmationEmail(booking: any): Promise<boolean> {
    const { customer, propertyId, checkInDate, checkOutDate, nights, guests, pricing, id } = booking;
    const to = customer.email;
    
    if (!to) {
      this.logger.error('No email address provided for booking confirmation');
      return false;
    }

    try {
      // Convert dates to readable format
      const formattedCheckIn = new Date(checkInDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const formattedCheckOut = new Date(checkOutDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: `Your Booking Confirmation #${id}`,
        text: this.getConfirmationPlainTextEmail(booking, formattedCheckIn, formattedCheckOut),
        html: this.getConfirmationHtmlEmail(booking, formattedCheckIn, formattedCheckOut)
      });
      
      this.logger.log(`📩 Booking confirmation email sent successfully to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Error sending booking confirmation email:', error);
      throw new Error(`Error sending booking confirmation email: ${error.message}`);
    }
  }

  /**
   * Send offline payment confirmation email to the guest
   */
  async sendOfflinePaymentConfirmationEmail(booking: any): Promise<boolean> {
    const { customer, propertyId, hostId, checkInDate, checkOutDate, nights, guests, pricing, id } = booking;
    const to = customer.email;
    
    if (!to) {
      this.logger.error('No email address provided for offline payment confirmation');
      return false;
    }

    try {
      // Fetch property and host details using microservices
      const [property, host] = await Promise.all([
        this.getPropertyDetails(propertyId),
        this.getHostDetails(hostId)
      ]);
      
      // Convert dates to readable format
      const formattedCheckIn = new Date(checkInDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const formattedCheckOut = new Date(checkOutDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // Generate PDF attachment
      const pdfBuffer = await this.generateBookingPDF(booking, property, host);

      // Send the email with attachment
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: `Payment Confirmation for Booking #${id}`,
        text: this.getOfflinePaymentPlainTextEmail(booking, property, host, formattedCheckIn, formattedCheckOut),
        html: this.getOfflinePaymentHtmlEmail(booking, property, host, formattedCheckIn, formattedCheckOut),
        attachments: [
          {
            filename: `booking-confirmation-${id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
      
      this.logger.log(`📩 Offline payment confirmation email sent successfully to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Error sending offline payment confirmation email:', error);
      throw new Error(`Error sending offline payment confirmation email: ${error.message}`);
    }
  }

  /**
   * Get plain text version of the email
   */
  private getConfirmationPlainTextEmail(booking: any, formattedCheckIn: string, formattedCheckOut: string): string {
    const { customer, propertyId, nights, guests, pricing, id } = booking;
    
    return `
      BOOKING CONFIRMATION #${id}
      
      Dear ${customer.fullName},
      
      Thank you for your booking request! Here's a summary of your reservation details:
      
      BOOKING DETAILS:
      Property ID: ${propertyId}
      Check-in: ${formattedCheckIn}
      Check-out: ${formattedCheckOut}
      Number of nights: ${nights}
      
      GUESTS:
      Adults: ${guests.adults}
      Children: ${guests.children || 0}
      Infants: ${guests.infants || 0}
      
      PRICING:
      Subtotal: $${pricing.subtotal.toFixed(2)}
      Service Charge: $${pricing.serviceCharge.toFixed(2)}
      Tax: $${pricing.taxAmount.toFixed(2)}
      Total: $${pricing.total.toFixed(2)}
      
      IMPORTANT:
      Your booking is currently pending host approval. You will receive another email once the host confirms your reservation, with instructions to proceed with payment.
      
      If you have any questions or need assistance, please don't hesitate to contact our support team.
      
      Thank you for choosing our service!
      
      Best regards,
      The Support Team
    `;
  }

  /**
   * Get HTML version of the email
   */
  private getConfirmationHtmlEmail(booking: any, formattedCheckIn: string, formattedCheckOut: string): string {
    const { customer, propertyId, nights, guests, pricing, id } = booking;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
        <div style="text-align: center; background-color: rgb(10, 7, 35); color: white; padding: 15px; border-radius: 4px;">
          <h1 style="margin: 0;">Booking Confirmation</h1>
          <p style="margin: 5px 0 0;">Ref: #${id}</p>
        </div>
        
        <div style="padding: 20px 0;">
          <p>Dear <strong>${customer.fullName}</strong>,</p>
          
          <p>Thank you for your booking request! Here's a summary of your reservation details:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
            <p><strong>Property ID:</strong> ${propertyId}</p>
            <p><strong>Check-in:</strong> ${formattedCheckIn}</p>
            <p><strong>Check-out:</strong> ${formattedCheckOut}</p>
            <p><strong>Number of nights:</strong> ${nights}</p>
            
            <h3 style="color: #333;">Guests</h3>
            <p><strong>Adults:</strong> ${guests.adults}</p>
            <p><strong>Children:</strong> ${guests.children || 0}</p>
            <p><strong>Infants:</strong> ${guests.infants || 0}</p>
            
            <h3 style="color: #333;">Pricing</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td>Subtotal</td>
                <td style="text-align: right;">$${pricing.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Service Charge</td>
                <td style="text-align: right;">$${pricing.serviceCharge.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax</td>
                <td style="text-align: right;">$${pricing.taxAmount.toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td>Total</td>
                <td style="text-align: right;">$${pricing.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div style="border-left: 4px solid #FFC107; padding: 10px; background-color: #FFF8E1; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important:</strong> Your booking is currently <span style="color: #FF9800; font-weight: bold;">pending host approval</span>. You will receive another email once the host confirms your reservation, with instructions to proceed with payment.</p>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Thank you for choosing our service!</p>
          
          <p>Best regards,<br>The Support Team</p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e4e4e4; color: #777; font-size: 12px;">
          <p>This is an automated email, please do not reply directly to this message.</p>
        </div>
      </div>
    `;
  }

  /**
   * Get plain text version of the offline payment confirmation email
   */
  private getOfflinePaymentPlainTextEmail(booking: any, property: any, host: any, formattedCheckIn: string, formattedCheckOut: string): string {
    const { customer, propertyId, nights, guests, pricing, id, paymentMethod } = booking;
    
    // Format host info based on whether it's an agency or individual
    const hostInfo = host.isAgency
      ? `Agency: ${host.businessName}
         Business ID: ${host.businessId}
         Head Office: ${host.headOffice}`
      : `Name: ${host.firstName} ${host.lastName}`;

    return `
      PAYMENT CONFIRMATION FOR BOOKING #${id}
      
      Dear ${customer.fullName},
      
      Great news! We are pleased to confirm that your ${paymentMethod.toUpperCase()} payment for booking #${id} has been successfully processed and your reservation is now confirmed.
      
      BOOKING DETAILS:
      Property: ${property.title}
      Address: ${property.address}, ${property.city}, ${property.country}
      Check-in: ${formattedCheckIn}
      Check-out: ${formattedCheckOut}
      Number of nights: ${nights}
      
      GUESTS:
      Adults: ${guests.adults}
      Children: ${guests.children || 0}
      Infants: ${guests.infants || 0}
      
      PRICING:
      Subtotal: $${pricing.subtotal.toFixed(2)}
      Service Charge: $${pricing.serviceCharge.toFixed(2)}
      Tax: $${pricing.taxAmount.toFixed(2)}
      Total: $${pricing.total.toFixed(2)}
      Payment Method: ${paymentMethod.toUpperCase()}
      
      HOST INFORMATION:
      ${hostInfo}
      Email: ${host.email}
      Phone: ${host.phoneNumber}
      
      PROPERTY DETAILS:
      Type: ${property.type}
      Size: ${property.size} sq ft
      Bedrooms: ${property.bedrooms}
      Bathrooms: ${property.bathrooms}
      Maximum Guests: ${property.maxGuest}
      
      IMPORTANT INFORMATION:
      A detailed PDF with your booking confirmation and all property details has been attached to this email. Please keep it for your records and bring it with you at check-in.
      
      If you need to contact the host directly regarding your stay, please use the contact information provided above.
      
      We wish you a pleasant stay!
      
      If you have any questions or need assistance, please don't hesitate to contact our support team.
      
      Thank you for choosing our service!
      
      Best regards,
      The Support Team
    `;
  }

  /**
   * Get HTML version of the offline payment confirmation email
   */
  private getOfflinePaymentHtmlEmail(booking: any, property: any, host: any, formattedCheckIn: string, formattedCheckOut: string): string {
    const { customer, propertyId, nights, guests, pricing, id, paymentMethod, confirmationDate } = booking;
    
    // Format confirmation date
    const formattedConfirmationDate = new Date(confirmationDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Host information section
    let hostInfoHTML = '';
    if (host.isAgency) {
      hostInfoHTML = `
        <p><strong>Agency:</strong> ${host.businessName}</p>
        <p><strong>Business ID:</strong> ${host.businessId}</p>
        <p><strong>Head Office:</strong> ${host.headOffice}</p>
      `;
    } else {
      hostInfoHTML = `
        <p><strong>Name:</strong> ${host.firstName} ${host.lastName}</p>
      `;
    }
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
        <div style="text-align: center; background-color: rgb(10, 7, 35); color: white; padding: 15px; border-radius: 4px;">
          <h1 style="margin: 0;">Payment Confirmed</h1>
          <p style="margin: 5px 0 0;">Booking Ref: #${id}</p>
        </div>
        
        <div style="padding: 20px 0;">
          <p>Dear <strong>${customer.fullName}</strong>,</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <p style="margin: 0;"><strong>Great news!</strong> We are pleased to confirm that your ${paymentMethod.toUpperCase()} payment has been successfully processed on ${formattedConfirmationDate} and your reservation is now confirmed.</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Booking Details</h3>
            <p><strong>Property:</strong> ${property.title}</p>
            <p><strong>Address:</strong> ${property.address}, ${property.city}, ${property.country}</p>
            <p><strong>Check-in:</strong> ${formattedCheckIn}</p>
            <p><strong>Check-out:</strong> ${formattedCheckOut}</p>
            <p><strong>Number of nights:</strong> ${nights}</p>
            
            <h3 style="color: #333;">Guests</h3>
            <p><strong>Adults:</strong> ${guests.adults}</p>
            <p><strong>Children:</strong> ${guests.children || 0}</p>
            <p><strong>Infants:</strong> ${guests.infants || 0}</p>
            
            <h3 style="color: #333;">Pricing</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td>Subtotal</td>
                <td style="text-align: right;">$${pricing.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Service Charge</td>
                <td style="text-align: right;">$${pricing.serviceCharge.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax</td>
                <td style="text-align: right;">$${pricing.taxAmount.toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td>Total</td>
                <td style="text-align: right;">$${pricing.total.toFixed(2)}</td>
              </tr>
            </table>
            <p><strong>Payment Method:</strong> <span style="text-transform: uppercase;">${paymentMethod}</span></p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Host Information</h3>
            ${hostInfoHTML}
            <p><strong>Email:</strong> ${host.email}</p>
            <p><strong>Phone:</strong> ${host.phoneNumber}</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Property Details</h3>
            <p><strong>Type:</strong> ${property.type}</p>
            <p><strong>Size:</strong> ${property.size} sq ft</p>
            <p><strong>Bedrooms:</strong> ${property.bedrooms}</p>
            <p><strong>Bathrooms:</strong> ${property.bathrooms}</p>
            <p><strong>Maximum Guests:</strong> ${property.maxGuest}</p>
          </div>
          
          <div style="border-left: 4px solid #2196F3; padding: 10px; background-color: #E3F2FD; margin: 20px 0;">
            <p style="margin: 0;"><strong>Important Information:</strong> A detailed PDF with your booking confirmation and all property details has been attached to this email. Please keep it for your records and bring it with you at check-in.</p>
          </div>
          
          <p>If you need to contact the host directly regarding your stay, please use the contact information provided above.</p>
          
          <p>We wish you a pleasant stay!</p>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Thank you for choosing our service!</p>
          
          <p>Best regards,<br>The Support Team</p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e4e4e4; color: #777; font-size: 12px;">
          <p>This is an automated email, please do not reply directly to this message.</p>
        </div>
      </div>
    `;
  }







  // Add this method to your BookingEmailService class
  /**
   * Send booking confirmation email with invoice and booking details as PDF attachments
   */
  async sendBookingConfirmationWithInvoice(confirmationData: any): Promise<boolean> {
    const { booking, payment, billingDetails, invoice } = confirmationData;
    const to = booking.customer.email;
    
    if (!to) {
      this.logger.error('No email address provided for booking confirmation with invoice');
      return false;
    }

    try {
      this.logger.log(`Sending booking confirmation email with invoice to: ${to}`);

      // Get property details
      //const property = await this.getPropertyDetails(booking.propertyId);
      const [property, host] = await Promise.all([
        this.getPropertyDetails(booking.propertyId),
        this.getHostDetails(booking.hostId)
      ]);

      // Format dates
      const formattedCheckIn = new Date(booking.checkInDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const formattedCheckOut = new Date(booking.checkOutDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Generate PDF attachments
      const bookingPdfPath = await this.generateBookingDetailsPDF(booking, property, host, formattedCheckIn, formattedCheckOut);
      const invoicePdfPath = await this.generateInvoicePDF(invoice, payment, billingDetails);

      // Send email with PDF attachments
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: `🎉 Booking Confirmed! Your stay is all set - Confirmation #${invoice.invoiceNumber}`,
        text: this.getConfirmationnPlainTextEmail(booking, invoice, payment, formattedCheckIn, formattedCheckOut),
        html: this.getConfirmationnHtmlEmail(booking, invoice, payment, formattedCheckIn, formattedCheckOut),
        attachments: [
          {
            filename: `Booking-Details-${booking._id}.pdf`,
            path: bookingPdfPath,
            contentType: 'application/pdf'
          },
          {
            filename: `Invoice-${invoice.invoiceNumber}.pdf`,
            path: invoicePdfPath,
            contentType: 'application/pdf'
          }
        ]
      });

      // Clean up temporary PDF files
      this.cleanupTempFiles([bookingPdfPath, invoicePdfPath]);

      this.logger.log(`📩 Booking confirmation email with invoice sent successfully to ${to}: ${info.messageId}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Error sending booking confirmation email with invoice: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Generate booking details PDF
   */
  private async generateBookingDetailsPDF(booking: any, property: any, host: any, formattedCheckIn: string, formattedCheckOut: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `booking-details-${booking._id}-${Date.now()}.pdf`;
      const filepath = path.join(__dirname, '../../temp', filename);

      // Ensure temp directory exists
      const tempDir = path.dirname(filepath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('BOOKING CONFIRMATION', { align: 'center' });
      doc.moveDown();
      
      // Booking ID and Status
      doc.fontSize(12)
        .text(`Booking ID: ${booking._id}`, { align: 'right' })
        .text(`Status: CONFIRMED & PAID`, { align: 'right' })
        .text(`Confirmed on: ${new Date().toLocaleDateString()}`, { align: 'right' });
      
      doc.moveDown(2);

      // Guest Information
      doc.fontSize(16).text('GUEST INFORMATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12)
        .text(`Name: ${booking.customer.fullName}`)
        .text(`Email: ${booking.customer.email}`)
        .text(`Phone: ${booking.customer.phone}`);
      
      if (booking.customer.message) {
        doc.text(`Message: ${booking.customer.message}`);
      }
      
      doc.moveDown(2);

      // Property Information - Enhanced
      doc.fontSize(16).text('PROPERTY INFORMATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12)
        .text(`Property: ${property.title}`, { continued: false })
        //.text(`Property ID: ${booking.propertyId}`)
        .text(`Type: ${property.type.charAt(0).toUpperCase() + property.type.slice(1)}`)
        .text(`Address: ${property.address}`)
        .text(`City: ${property.city}`)
        .text(`Country: ${property.country}`);

      // Property specifications
      doc.moveDown(0.5);
      doc.fontSize(14).text('Property Specifications:', { underline: true });
      doc.fontSize(12)
        .text(`• Size: ${property.size} m²`)
        .text(`• Rooms: ${property.rooms}`)
        .text(`• Bedrooms: ${property.bedrooms}`)
        .text(`• Bathrooms: ${property.bathrooms}`)
        .text(`• Number of Beds: ${property.beds_Number}`)
        .text(`• Maximum Guests: ${property.maxGuest}`);

      // Additional property details based on type
      if (property.type === 'apartment') {
        doc.text(`• Floor Number: ${property.floorNumber}`);
      } else if (property.lotSize) {
        doc.text(`• Lot Size: ${property.lotSize} m²`);
      }

      if (property.numberOfBalconies > 0) {
        doc.text(`• Balconies: ${property.numberOfBalconies}`);
      }

      // Property description
      if (property.description) {
        doc.moveDown(0.5);
        doc.fontSize(14).text('Property Description:', { underline: true });
        doc.fontSize(12).text(property.description, { align: 'justify' });
      }

      // Amenities
      if (property.amenities && Object.keys(property.amenities).length > 0) {
        doc.moveDown(1);
        doc.fontSize(14).text('Available Amenities:', { underline: true });
        doc.fontSize(12);
        
        const amenitiesList: string[] = [];
        Object.entries(property.amenities).forEach(([key, value]) => {
          if (value === true) {
            const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            amenitiesList.push(displayName);
          }
        });

        if (amenitiesList.length > 0) {
          // Split amenities into columns for better layout
          for (let i = 0; i < amenitiesList.length; i += 2) {
            const line = amenitiesList.slice(i, i + 2).map(item => `• ${item}`).join('    ');
            doc.text(line);
          }
        }
      }

      doc.moveDown(2);

      // Host Contact Information
      doc.fontSize(16).text('HOST CONTACT INFORMATION', { underline: true });
      doc.moveDown(0.5);
      
      if (host.isAgency) {
        doc.fontSize(12)
          .text(`Business Name: ${host.businessName}`)
          //.text(`Business ID: ${host.businessId || 'N/A'}`)
          .text(`Head Office: ${host.headOffice || 'N/A'}`);
      } else {
        doc.fontSize(12)
          .text(`Host Name: ${host.firstName} ${host.lastName}`)
          //.text(`Host ID: ${host.id || 'N/A'}`);
        
        if (host.address) {
          //doc.text(`Address: ${host.address}`);
        }
      }

      doc.text(`Email: ${host.email}`)
        .text(`Phone: ${host.phoneNumber}`)
        .text(`Country: ${host.country}`);

      // Representative information if applicable
      if (host.hasRepresentative && host.proxy) {
        doc.moveDown(0.5);
        doc.fontSize(12).text('Representative Information:', { underline: true });
        doc.text(`Representative: ${host.proxy}`)
         // .text(`Representative ID: ${host.repId || 'N/A'}`);
      }

      // Property contact info if available
      if (property.phone || property.email || property.website) {
        doc.moveDown(1);
        doc.fontSize(14).text('Direct Property Contact:', { underline: true });
        doc.fontSize(12);
        
        if (property.phone) {
          doc.text(`Phone: ${property.phone}`);
        }
        if (property.email) {
          doc.text(`Email: ${property.email}`);
        }
        if (property.website) {
          doc.text(`Website: ${property.website}`);
        }
      }

      doc.moveDown(2);

      // Stay Details
      doc.fontSize(16).text('STAY DETAILS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12)
        .text(`Check-in: ${formattedCheckIn}`)
        .text(`Check-out: ${formattedCheckOut}`)
        .text(`Duration: ${booking.nights} night(s)`)
        .text(`Adults: ${booking.guests.adults}`)
        .text(`Children: ${booking.guests.children || 0}`)
        .text(`Infants: ${booking.guests.infants || 0}`);

      // Property policies
      if (property.policies && Object.keys(property.policies).length > 0) {
        doc.moveDown(1);
        doc.fontSize(14).text('Property Policies:', { underline: true });
        doc.fontSize(12);

        const policies = property.policies;
        
        if (policies.check_in_start && policies.check_in_end) {
          doc.text(`• Check-in: ${policies.check_in_start} - ${policies.check_in_end}`);
        }
        if (policies.check_out_start && policies.check_out_end) {
          doc.text(`• Check-out: ${policies.check_out_start} - ${policies.check_out_end}`);
        }
        if (policies.quiet_hours_start && policies.quiet_hours_end) {
          doc.text(`• Quiet hours: ${policies.quiet_hours_start} - ${policies.quiet_hours_end}`);
        }
        
        // Policy restrictions
        const restrictions: string[] = [];
        if (policies.smoking === false) restrictions.push('No smoking');
        if (policies.pets === false) restrictions.push('No pets');
        if (policies.parties_or_events === false) restrictions.push('No parties or events');
        if (!policies.guests_allowed) restrictions.push('No additional guests');
        
        if (restrictions.length > 0) {
          doc.text(`• Restrictions: ${restrictions.join(', ')}`);
        }

        if (policies.cancellation_policy) {
          doc.text(`• Cancellation Policy: ${policies.cancellation_policy}`);
        }
        
        if (policies.cleaning_maintenance) {
          doc.text(`• Cleaning/Maintenance: ${policies.cleaning_maintenance}`);
        }
      }

      // Payment methods
      /*if (property.means_of_payment && property.means_of_payment.length > 0) {
        doc.moveDown(1);
        doc.fontSize(14).text('Accepted Payment Methods:', { underline: true });
        doc.fontSize(12).text(`• ${property.means_of_payment.join(', ')}`);
      }*/

      doc.moveDown(2);

      // Important Information
      doc.fontSize(16).text('IMPORTANT INFORMATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12)
        .text('• Save this confirmation for your records')
        .text('• You will receive check-in instructions closer to your arrival date')
        .text('• Contact your host if you have any questions')
        .text('• Show this confirmation during check-in if requested')
        .text('• Please respect the property policies and local regulations')
        .text('• Emergency contact information is available through your host');

      // Stay requirements
      doc.moveDown(1);
      doc.fontSize(12)
        //.text(`• Minimum stay: ${property.minNight} night(s)`)
        //.text(`• Maximum stay: ${property.maxNight} night(s)`);

      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Generate invoice PDF
   */
  private async generateInvoicePDF(invoice: any, payment: any, billingDetails: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`;
      const filepath = path.join(__dirname, '../../temp', filename);

      // Ensure temp directory exists
      const tempDir = path.dirname(filepath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Format currency helper
      const formatCurrency = (amount: number, currency: string = 'EUR') => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency.toUpperCase(),
        }).format(amount / 100);
      };

      // Header
      doc.fontSize(24).text('INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Invoice details
      doc.fontSize(12)
         .text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' })
         .text(`Issue Date: ${invoice.issueDate.toLocaleDateString()}`, { align: 'right' })
         .text(`Payment Status: PAID IN FULL`, { align: 'right' });
      
      doc.moveDown(2);

      // Bill To section
      doc.fontSize(16).text('BILL TO:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12)
         .text(`${invoice.customerName}`)
         .text(`${invoice.customerEmail}`);
      
      doc.moveDown(2);

      // Service Details
      doc.fontSize(16).text('SERVICE DETAILS:', { underline: true });
      doc.moveDown(0.5);
      
      let yPosition = doc.y;
      invoice.lineItems.forEach((item: any) => {
        doc.fontSize(12)
           .text(`${item.description}`, 50, yPosition)
           .text(`${formatCurrency(item.subtotal, payment.currency)}`, 450, yPosition, { align: 'right' });
        yPosition += 20;
        
        doc.fontSize(10)
           .text(`Check-in: ${new Date(item.checkIn).toLocaleDateString()}`, 70, yPosition)
           .text(`Check-out: ${new Date(item.checkOut).toLocaleDateString()}`, 70, yPosition + 12);
        yPosition += 35;
      });

      doc.y = yPosition + 20;

      // Payment Breakdown
      doc.fontSize(16).text('PAYMENT BREAKDOWN:', { underline: true });
      doc.moveDown(0.5);
      
      const breakdownY = doc.y;
      doc.fontSize(12)
         .text('Subtotal:', 50, breakdownY)
         .text(`${formatCurrency(payment.subtotal || 0, payment.currency)}`, 450, breakdownY, { align: 'right' })
         .text('Service Charge:', 50, breakdownY + 20)
         .text(`${formatCurrency(payment.serviceCharge || 0, payment.currency)}`, 450, breakdownY + 20, { align: 'right' })
         .text('Taxes & Fees:', 50, breakdownY + 40)
         .text(`${formatCurrency(payment.taxAmount || 0, payment.currency)}`, 450, breakdownY + 40, { align: 'right' });

      let currentY = breakdownY + 60;
      if (payment.platformFeeAmount > 0) {
        doc.text(`Platform Fee (${payment.plan}):`, 50, currentY)
           .text(`${formatCurrency(payment.platformFeeAmount, payment.currency)}`, 450, currentY, { align: 'right' });
      } else {
        doc.text(`Platform Fee (${payment.plan}):`, 50, currentY)
           .text('FREE', 450, currentY, { align: 'right' });
      }
      currentY += 20;

      // Total line
      doc.moveTo(50, currentY + 10).lineTo(550, currentY + 10).stroke();
      doc.fontSize(14).font('Helvetica-Bold')
         .text('TOTAL PAID:', 50, currentY + 20)
         .text(`${formatCurrency(payment.amount, payment.currency)}`, 450, currentY + 20, { align: 'right' });

      doc.moveDown(3);

      // Payment Information
      doc.fontSize(16).font('Helvetica').text('PAYMENT INFORMATION:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12)
         .text(`Payment Method: ${invoice.paymentDetails.method}`)
         //.text(`Transaction ID: ${invoice.paymentDetails.transactionId}`)
         .text(`Payment Date: ${new Date(payment.paidAt).toLocaleDateString()} at ${new Date(payment.paidAt).toLocaleTimeString()}`);

      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Get confirmation plain text email
   */
  private getConfirmationnPlainTextEmail(booking: any, invoice: any, payment: any, formattedCheckIn: string, formattedCheckOut: string): string {
    const formatCurrency = (amount: number, currency: string = 'EUR') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount / 100);
    };

    return `
BOOKING CONFIRMED! 🎉

Dear ${booking.customer.fullName},

Your payment has been processed successfully and your booking is confirmed!

CONFIRMATION DETAILS:
• Confirmation Number: ${invoice.invoiceNumber}
• Booking ID: ${booking._id}
• Status: CONFIRMED & PAID
• Confirmed on: ${new Date().toLocaleDateString()}

YOUR STAY SUMMARY:
• Check-in: ${formattedCheckIn}
• Check-out: ${formattedCheckOut}
• Duration: ${booking.nights} night(s)
• Guests: ${booking.guests.adults} adult(s)${booking.guests.children > 0 ? `, ${booking.guests.children} child(ren)` : ''}

PAYMENT SUMMARY:
• Total Paid: ${formatCurrency(payment.amount, payment.currency)}
• Payment Method: ${invoice.paymentDetails.method}
• Status: PAID IN FULL

ATTACHED DOCUMENTS:
• Booking Details PDF - Complete information about your stay
• Invoice PDF - Payment and billing details

WHAT'S NEXT?
✓ Save this confirmation email and attached documents for your records
✓ You'll receive check-in instructions closer to your arrival date
✓ Contact your host if you have any questions
✓ Prepare for an amazing stay!

Questions? Contact us at support@yourplatform.com

Thank you for choosing our service! We hope you have a wonderful stay.

Best regards,
The Support Team

---
This confirmation serves as your receipt and proof of payment.
Please keep this email and attachments for your records.
    `;
  }

  /**
   * Get confirmation HTML email
   */
  private getConfirmationnHtmlEmail(booking: any, invoice: any, payment: any, formattedCheckIn: string, formattedCheckOut: string): string {
    const formatCurrency = (amount: number, currency: string = 'EUR') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount / 100);
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
        <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 4px;">
          <h1 style="margin: 0;">🎉 Booking Confirmed!</h1>
          <p style="margin: 5px 0 0;">Your payment has been processed successfully</p>
        </div>
        
        <div style="padding: 20px 0;">
          <p>Dear <strong>${booking.customer.fullName}</strong>,</p>
          
          <p>Your payment has been processed successfully and your booking is confirmed!</p>
          
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #155724;">✅ Confirmation Details</h3>
            <p><strong>Confirmation Number:</strong> <span style="color: #28a745; font-weight: bold;">${invoice.invoiceNumber}</span></p>
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">CONFIRMED & PAID</span></p>
            <p><strong>Confirmed on:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">📅 Your Stay Summary</h3>
            <p><strong>Check-in:</strong> ${formattedCheckIn}</p>
            <p><strong>Check-out:</strong> ${formattedCheckOut}</p>
            <p><strong>Duration:</strong> ${booking.nights} night(s)</p>
            <p><strong>Guests:</strong> ${booking.guests.adults} adult(s)${booking.guests.children > 0 ? `, ${booking.guests.children} child(ren)` : ''}</p>
          </div>

          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">💳 Payment Summary</h3>
            <p><strong>Total Paid:</strong> <span style="color: #28a745; font-weight: bold;">${formatCurrency(payment.amount, payment.currency)}</span></p>
            <p><strong>Payment Method:</strong> ${invoice.paymentDetails.method}</p>
            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">PAID IN FULL</span></p>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">📎 Attached Documents</h3>
            <p style="margin: 5px 0;">• <strong>Booking Details PDF</strong> - Complete information about your stay</p>
            <p style="margin: 5px 0;">• <strong>Invoice PDF</strong> - Payment and billing details</p>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #155724;">✨ What's Next?</h3>
            <ul style="color: #155724; margin: 10px 0;">
              <li>Save this confirmation email and attached documents for your records</li>
              <li>You'll receive check-in instructions closer to your arrival date</li>
              <li>Contact your host if you have any questions</li>
              <li>Prepare for an amazing stay!</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6c757d;">Questions about your booking?</p>
            <a href="mailto:support@yourplatform.com" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px;">Contact Support</a>
          </div>
          
          <p>Thank you for choosing our service! We hope you have a wonderful stay.</p>
          
          <p>Best regards,<br>The Support Team</p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e4e4e4; color: #777; font-size: 12px;">
          <p><strong>Important:</strong> This confirmation serves as your receipt and proof of payment.</p>
          <p>Please keep this email and attachments for your records.</p>
          <p style="margin-top: 15px;">This is an automated email, please do not reply directly to this message.</p>
        </div>
      </div>
    `;
  }

  /**
   * Clean up temporary files
   */
  private cleanupTempFiles(filePaths: string[]): void {
    filePaths.forEach(filepath => {
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          this.logger.debug(`Cleaned up temp file: ${filepath}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to cleanup temp file ${filepath}: ${error.message}`);
      }
    });
  }

  /**
   * Get property details from property service
   */
 /* private async getPropertyDetails(propertyId: string): Promise<any> {
    try {
      const property = await lastValueFrom(
        this.propertyServiceClient.send('get_property_by_id', { propertyId })
      );
      return property;
    } catch (error) {
      this.logger.error(`Failed to get property details for ${propertyId}:`, error);
      return { title: `Property ${propertyId}` }; // Fallback
    }
  }*/


























    // 2. Add method to BookingEmailService (booking microservice)
/**
 * Send a booking cancellation email to the guest
 */
async sendBookingCancellationEmail(booking: any): Promise<boolean> {
  const { customer, propertyId, checkInDate, checkOutDate, nights, guests, pricing, id } = booking;
  const to = customer.email;
  
  if (!to) {
    this.logger.error('No email address provided for booking cancellation');
    return false;
  }

  try {
    const [property] = await Promise.all([
      this.getPropertyDetails(propertyId),
    ]);

    // Convert dates to readable format
    const formattedCheckIn = new Date(checkInDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const formattedCheckOut = new Date(checkOutDate).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const info = await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: to,
      subject: `Booking Cancellation Confirmation #${id}`,
      text: this.getCancellationPlainTextEmail(booking, property, formattedCheckIn, formattedCheckOut),
      html: this.getCancellationHtmlEmail(booking, property, formattedCheckIn, formattedCheckOut)
    });
    
    this.logger.log(`📩 Booking cancellation email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    this.logger.error('❌ Error sending booking cancellation email:', error);
    throw new Error(`Error sending booking cancellation email: ${error.message}`);
  }
}

/**
 * Get plain text version of the cancellation email
 */
private getCancellationPlainTextEmail(booking: any, property: any, formattedCheckIn: string, formattedCheckOut: string): string {
  const { customer, nights, guests, pricing, id } = booking;
  
  return `
    Booking Cancellation Confirmation #${id}
    
    Dear ${customer.fullName},
    
    Your booking has been successfully canceled. Here are the details of your canceled reservation:
    
    CANCELED BOOKING DETAILS:
    Property: ${property.title}
    Check-in: ${formattedCheckIn}
    Check-out: ${formattedCheckOut}
    Number of nights: ${nights}
    
    GUESTS:
    Adults: ${guests.adults}
    Children: ${guests.children || 0}
    Infants: ${guests.infants || 0}
    
    We're sorry to see you cancel your reservation. If you have any questions or need assistance with future bookings, please don't hesitate to contact our support team.
    
    Thank you for using our service!
    
    Best regards,
    The Support Team
  `;
}

/**
 * Get HTML version of the cancellation email
 */
private getCancellationHtmlEmail(booking: any, property: any, formattedCheckIn: string, formattedCheckOut: string): string {
  const { customer, nights, guests, pricing, id } = booking;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
      <div style="text-align: center; background-color: #dc3545; color: white; padding: 15px; border-radius: 4px;">
        <h1 style="margin: 0;">Booking Canceled</h1>
        <p style="margin: 5px 0 0;">Ref: #${id}</p>
      </div>
      
      <div style="padding: 20px 0;">
        <p>Dear <strong>${customer.fullName}</strong>,</p>
        
        <p>Your booking has been successfully canceled. Here are the details of your canceled reservation:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Canceled Booking Details</h3>
          <p><strong>Property:</strong> ${property.title}</p>
          <p><strong>Check-in:</strong> ${formattedCheckIn}</p>
          <p><strong>Check-out:</strong> ${formattedCheckOut}</p>
          <p><strong>Number of nights:</strong> ${nights}</p>
          
          <h3 style="color: #333;">Guests</h3>
          <p><strong>Adults:</strong> ${guests.adults}</p>
          <p><strong>Children:</strong> ${guests.children || 0}</p>
          <p><strong>Infants:</strong> ${guests.infants || 0}</p>
        </div>
        
        
        
        <p>We're sorry to see you cancel your reservation. If you have any questions or need assistance with future bookings, please don't hesitate to contact our support team.</p>
        
        <p>Thank you for using our service!</p>
        
        <p>Best regards,<br>The Support Team</p>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e4e4e4; color: #777; font-size: 12px;">
        <p>This is an automated email, please do not reply directly to this message.</p>
      </div>
    </div>
  `;
}
  
}