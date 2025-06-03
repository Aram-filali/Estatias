import * as nodemailer from 'nodemailer';
import * as jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schema/user.schema';
import { UserService } from '../app.service';

config(); 

interface JwtPayload {
  email: string;
  iat: number;
  exp: number;
}

@Injectable()
export class EmailService {
  private transporter;
  private readonly secretKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(
    @Inject(forwardRef(() => UserService)) private userService: UserService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    console.log("Email configuration setup with:", {
      user: process.env.GMAIL_USER,
      passwordExists: !!process.env.GMAIL_APP_PASSWORD,
      passwordLength: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.length : 0
    });
  
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      debug: true // Enable debug output
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
  }

  public getSecretKey(): string {
    // Use the same fallback and priority as the gateway
    const key = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'fallbackSecretKey';
    console.log(`Email service using secret key with length: ${key.length}`);
    return key;
  }

  async sendResetPasswordEmail(to: string) {
    // 1. Vérifier d'abord si l'email existe dans la base de données
    const userExists = await this.userModel.findOne({ email: to }).exec();
    
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
  
    const resetLink = `http://localhost:3002/reset-password?token=${resetToken}`;
  
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

      const firebaseUser = await this.userService.updatePasswordInFirebase(userEmail, newPassword);
      if (!firebaseUser) {
        console.error('❌ Error updating password in Firebase');
        return false;
      }

      /*const mongoUser = await this.userService.updatePasswordInMongo(userEmail, newPassword);
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


  async sendVerificationEmail(to, userId) {
    
    const verificationToken = jwt.sign({
      email: to,
      userId: userId
    }, this.getSecretKey(), {
      expiresIn: '24h'
    });
  

    // Update to use frontend URL, not API URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3002';
    const verificationLink = `${clientUrl}/verify-email?token=${verificationToken}`;
    
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
}