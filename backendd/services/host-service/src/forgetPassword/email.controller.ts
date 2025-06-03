import { Controller, Logger  } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { HostService } from '../app.service';
import * as jwt from 'jsonwebtoken';

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

@Controller()
  

export class EmailController {
  private readonly logger = new Logger(EmailController.name);
  constructor(
    private readonly emailService: EmailService,
    private readonly hostService: HostService,
  ) {}

  @MessagePattern({ cmd: 'send_reset_password_email' })
  async sendResetPasswordEmail(@Payload() data: { email: string }) {
    const email = data.email;
    const user = await this.hostService.findOneByEmail(email);
    if (!user) {
      return { error: 'User not found' };
    }
    
    
    if (!email) {
      return { error: '⚠️ Email address is required' };
    }
    
    try {
      
      const userExists = await this.hostService.findOneByEmail(email);
      if (!userExists) {
    
        return { message: '📩 Password reset email sent successfully' };
      }

      await this.emailService.sendResetPasswordEmail(email);
      return { message: '📩 Password reset email sent successfully' };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { error: '❌ Error sending the email' };
    }
  }
  
  @MessagePattern({ cmd: 'test_email_delivery' })
  async testEmailDelivery(@Payload() data: { testEmail: string }) {
    const { testEmail } = data;
    
    if (!testEmail) {
      return { error: '⚠️ Test email address is required' };
    }
    
    try {
      const result = await this.emailService.testEmailDelivery(testEmail);
      return { 
        message: '📩 Test email sent successfully',
        details: result 
      };
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      return { error: '❌ Error sending the test email' };
    }
  }

  @MessagePattern({ cmd: 'validate_token' })
  async validateToken(@Payload() data: { token: string }) {
    const { token } = data;
    
    if (!token) return { error: '⚠️ Missing token' };
    
    try {
      const isValid = await this.emailService.validateResetToken(token);
      if (isValid) {
        return { message: '✅ Valid token' };
      } else {
        return { error: '⛔ Invalid or expired token' };
      }
    } catch (error) {
      console.error("❌ Error validating token:", error);
      return { error: '⛔ Invalid or expired token' };
    }
  }

  @MessagePattern({ cmd: 'reset_password' })
  async resetPassword(@Payload() data: { token: string; newPassword: string }) {
    const { token, newPassword } = data;
    
    if (!token || !newPassword) return { error: '⚠️ Missing token or new password' };
    
    try {
      const success = await this.emailService.resetPassword(token, newPassword);
      
      if (success) {
        return { message: '✅ Password reset successfully' };
      } else {
        return { error: '❌ Error updating password' };
      }
    } catch (error) {
      console.error('❌ Error during password reset:', error);
      return { error: '⛔ Invalid or expired token' };
    }
  }

  @MessagePattern({ cmd: 'change_password' })
  async changePassword(@Payload() data: { userId: string; newPassword: string }) {
    const { userId, newPassword } = data;
  
    if (!userId || !newPassword) {
      return { statusCode: 400, message: '⚠️ Les champs userId et newPassword sont requis.' };
    }
  
    try {
      // Mettre à jour le mot de passe avec Firebase Admin SDK
      const success = await this.emailService.updatePassword(userId, newPassword);
  
      if (success) {
        // Si le mot de passe est changé avec succès, renvoyer un code 200
        return { statusCode: 200, message: '✅ Mot de passe changé avec succès.' };
      } else {
        // Si la mise à jour échoue, renvoyer un code 400
        return { statusCode: 400, message: '❌ Échec de la mise à jour du mot de passe.' };
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du mot de passe:', error);
      return { statusCode: 500, message: '⛔ Une erreur est survenue lors du traitement de la demande.' };
    }
  }

  // Add this message pattern to the EmailController in host microservice

// Add an event handler for new booking notifications
  @EventPattern('new_booking_created')
  async handleNewBooking(@Payload() data: BookingNotification) {
    this.logger.log(`Received new booking notification for host: ${data.hostId}`);
    
    try {
      // Fetch the host to get their email address
      const host = await this.hostService.findByFirebaseUid(data.hostId);
      
      if (!host) {
        this.logger.error(`Host with ID ${data.hostId} not found`);
        return;
      }
      
      // Send notification email to the host
      await this.emailService.sendNewBookingAlert(host, data);
      this.logger.log(`New booking alert email sent to host: ${host.email}`);
    } catch (error) {
      this.logger.error(`Error handling new booking notification: ${error.message}`, error.stack);
    }
  }
}