import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EmailService } from './email.service';
import { UserService } from '../app.service';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  email: string;
  iat: number;
  exp: number;
}

@Controller()
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly userService: UserService,
  ) {}

  /*@MessagePattern({ cmd: 'send_reset_password_email' })
async sendResetPasswordEmail(@Payload() email: string) {
  if (!email) {
    return { error: '⚠️ Email address is required' };
  }
  
  try {
    const userExists = await this.userService.findOneByEmail(email);
    if (!userExists) {
      return { message: '📩 Password reset email sent successfully' };
    }
    
    await this.emailService.sendResetPasswordEmail(email);
    return { message: '📩 Password reset email sent successfully' };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { error: '❌ Error sending the email' };
  }
}*/
  
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
    console.log('Validating token:', data.token?.substring(0, 20) + '...');
    const { token } = data;
    
    if (!token) {
      return { error: '⚠️ Missing token' };
    }
    
    try {
      const isValid = await this.emailService.validateResetToken(token);
      console.log('Token validation result:', isValid);
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

  /*@MessagePattern({ cmd: 'change_password' })
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
  }*/
}