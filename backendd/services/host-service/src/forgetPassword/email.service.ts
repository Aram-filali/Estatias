import * as nodemailer from 'nodemailer';
import * as jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import { HostService } from '../app.service';
import { Injectable,Logger, Inject,  forwardRef} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Model } from 'mongoose';
import { Host, HostDocument } from '../schema/host.schema';
import { InjectModel } from '@nestjs/mongoose';


config(); 

interface JwtPayload {
  email: string;
  iat: number;
  exp: number;
}

interface BookingNotification {
  bookingId: string;
  hostId: string;
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: {
    adults: number;
    children?: number;
    infants?: number;
  };
}

@Injectable()
export class EmailService {
  private transporter;
  private readonly secretKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly logger = new Logger(EmailService.name);
  private readonly dashboardUrl: string;

  constructor(
    @InjectModel(Host.name) private readonly hostModel: Model<HostDocument>,
    @Inject(forwardRef(() => HostService)) private hostService: HostService,
  ) {
    console.log("Email configuration setup with:", {
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
      debug: true 
    });
  
  
    this.transporter.verify(function(error, success) {
      if (error) {
        console.log("SMTP connection error:", error);
      } else {
        console.log("SMTP server is ready to take our messages");
      }
    });
  
    this.secretKey = process.env.JWT_SECRET || 'fallbackSecretKey';
    this.fromEmail = process.env.GMAIL_USER || 'your-email@gmail.com';
    this.fromName = process.env.FROM_NAME || 'Your Application';
    this.dashboardUrl = process.env.DASHBOARD_URL || 'https://yourdomain.com';
  }

  public getSecretKey(): string {
    // Use the same fallback and priority as the gateway
    const key = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'fallbackSecretKey';
    console.log(`Email service using secret key with length: ${key.length}`);
    return key;
  }

  async sendResetPasswordEmail(to: string) {
    // 1. Vérifier d'abord si l'email existe dans la base de données
    const userExists = await this.hostModel.findOne({ email: to }).exec();
    
    if (!userExists) {
      console.log(`Tentative de réinitialisation pour email non enregistré: ${to}`);
      // Ne pas révéler que l'email n'existe pas (pour des raisons de sécurité)
      return true; // On retourne true même si l'email n'existe pas pour ne pas divulger d'information
    }
  
    // 2. Si l'email existe, générer le token et envoyer l'email
    const resetToken = jwt.sign({ 
      email: to,
      userId: userExists._id // Ajouter l'ID utilisateur pour plus de sécurité
    }, this.getSecretKey(), { 
      expiresIn: '1h' 
    });
  
    const resetLink = `http://localhost:3001/reset-password?token=${resetToken}`;
  
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: '🔐 Password Reset Request',
        text: `Click this link to reset your password: ${resetLink}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4a4a4a;">Password Reset</h2>
            <p>Hello,</p>
            <p>We received a request to reset the password for your account.</p>
            <p>Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color:rgb(10, 7, 35); color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px;">Reset My Password</a>
            </div>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this reset, please ignore this email.</p>
            <p>Thank you,<br>The Support Team</p>
          </div>
        `
      });
      
      console.log('📩 Email sent successfully to registered user:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Erreur détaillée:', {
        name: error.name,
        code: error.code,
        message: error.message,
        responseCode: error.responseCode,
        response: error.response,
        stack: error.stack
      });
      throw new Error('Error sending email: ' + JSON.stringify({code: error.code, message: error.message}));
    }
  }


  async testEmailDelivery(testEmail: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: testEmail,
        subject: 'Email Delivery Test - Password Reset',
        text: `This is a test email to verify that the email sending system works correctly.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4a4a4a;">Email Delivery Test</h2>
            <p>Hello,</p>
            <p>This is a test email to verify that the email sending system works correctly.</p>
            <p>If you receive this email, it means the system is working properly.</p>
            <p>Thank you,<br>The Support Team</p>
          </div>
        `
      });
      
      console.log('📩 Test email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error while sending the test email:', error);
      throw new Error('Error sending test email: ' + error.message);
    }
  }

  async validateResetToken(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, this.getSecretKey());
      return !!decoded;
    } catch (error) {
      console.error("❌ Erreur de validation du token :", error);
      return false;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, this.getSecretKey()) as JwtPayload;
      const userEmail = decoded.email;

      const firebaseUser = await this.hostService.updatePasswordInFirebase(userEmail, newPassword);
      if (!firebaseUser) {
        console.error('❌ Error updating password in Firebase');
        return false;
      }

      /*const mongoUser = await this.hostService.updatePasswordInMongo(userEmail, newPassword);
      if (!mongoUser) {
        console.error('❌ Error updating password in MongoDB');
        return false;
      }*/

      return true;
    } catch (error) {
      console.error("❌ Erreur pendant le reset password :", error);
      return false;
    }
  }

  /* UPDATE PASSWORD IN THE PROILE (HOST:MEMBER) */
  async updatePassword(userId: string, newPassword: string): Promise<{ statusCode: number, message: string }> {
    try {
      // Utiliser directement Firebase Admin SDK pour mettre à jour le mot de passe
      await admin.auth().updateUser(userId, {
        password: newPassword
      });
  
      console.log('Password updated in Firebase for user:', userId);
      return { statusCode: 200, message: '✅ Mot de passe changé avec succès.' }; // Retourne un code 200
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe Firebase:', error);
      return { statusCode: 500, message: '⛔ Erreur lors de la mise à jour du mot de passe.' }; // Retourne un code 500 si erreur
    }
  }  


 // Update the sendVerificationEmail method in your EmailService class

async sendVerificationEmail(to, userId) {
  
  const verificationToken = jwt.sign({
    email: to,
    userId: userId,
    purpose: 'email-verification' // Add purpose to token
  }, this.getSecretKey(), {
    expiresIn: '1h'
  });

  // Update to use frontend URL, not API URL
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3001';
  const verificationLink = `${clientUrl}/create-site/verify-email?token=${verificationToken}`;
  
  console.log('Creating verification link:', verificationLink);

  try {
    const info = await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: to,
      subject: '✅ Verify Your Email Address',
      text: `Click this link to verify your email: ${verificationLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4a4a4a;">Email Verification</h2>
          <p>Hello,</p>
          <p>Thank you for registering with us. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: rgb(10, 7, 35); color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a>
          </div>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not create an account, please ignore this email.</p>
          <p>Thank you,<br>The Support Team</p>
        </div>
      `
    });
    
    console.log('📩 Verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}


  /*async validateVerificationToken(token: string): Promise<{isValid: boolean; email?: string}> {
    try {
      const decoded = jwt.verify(token, this.secretKey) as { email: string; purpose: string };
      
      // Check if token is for email verification
      if (decoded.purpose !== 'email-verification') {
        return { isValid: false };
      }
      
      // Check if user exists
      const user = await this.hostModel.findOne({ email: decoded.email }).exec();
      if (!user) {
        return { isValid: false };
      }
      
      return { isValid: true, email: decoded.email };
    } catch (error) {
      this.logger.error(`Error validating verification token: ${error.message}`);
      return { isValid: false };
    }
  }*/




    // Add a method to send new booking notification emails to hosts
  async sendNewBookingAlert(host: Host, bookingData: BookingNotification): Promise<void> {
    this.logger.log(`Preparing new booking alert email for host: ${host.email}`);
    
    // Determine host name based on profile type
    const hostName = host.isAgency 
      ? host.businessName 
      : `${host.firstName} ${host.lastName}`;
    
    // Calculate total guests
    const totalGuests = bookingData.guests.adults + 
      (bookingData.guests.children || 0) + 
      (bookingData.guests.infants || 0);
    
    // Generate direct URL to booking details
    //const bookingUrl = `${this.dashboardUrl}/MyWebsite/bookings/${bookingData.bookingId}`;
    const bookingUrl = `${this.dashboardUrl}/MyWebsite/bookings`;
    // Prepare email content
    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: host.email,
      subject: '🔔 New Booking Request Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
          <h2 style="color: #333; text-align: center;">New Booking Request</h2>
          <p style="font-size: 16px;">Hello ${hostName},</p>
          <p style="font-size: 16px;">You have a new booking request for your property!</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Booking Details:</h3>
            <ul style="list-style-type: none; padding-left: 0;">
              <li><strong>Property ID:</strong> ${bookingData.propertyId}</li>
              <li><strong>Check-in:</strong> ${bookingData.checkInDate}</li>
              <li><strong>Check-out:</strong> ${bookingData.checkOutDate}</li>
              <li><strong>Guests:</strong> ${totalGuests} total</li>
              <li><strong>Booking ID:</strong> ${bookingData.bookingId}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${bookingUrl}" style="background-color: #007bff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Booking Details</a>
          </div>
          
          <p style="font-size: 16px;">Please log in to your dashboard to review and respond to this booking request.</p>
          <p style="font-size: 16px;">Reservations must be responded to within 24 hours to maintain your response rate.</p>
          
          <div style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    };
    
    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`New booking alert email sent successfully to ${host.email}`);
    } catch (error) {
      this.logger.error(`Failed to send new booking alert email: ${error.message}`, error.stack);
      throw error;
    }
  }
}