import { Controller, HttpStatus, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { HostService } from './app.service';
import { CreateHostDto } from './dto/create-host.dto';
import { EmailService } from './forgetPassword/email.service';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Host, HostDocument } from './schema/host.schema';
import { Model } from 'mongoose';
//import { JwtService } from '@nestjs/jwt';
import { FirebaseAdminService } from './firebase/firebase';
import { JwtPayload } from 'jsonwebtoken';

@Controller()
export class HostController {
  private readonly logger = new Logger(HostController.name);
  constructor(
    private readonly hostService: HostService,
    private readonly emailService: EmailService,
    private readonly firebaseAdminService: FirebaseAdminService,
    //private readonly jwtService: JwtService,
    @InjectModel(Host.name) private readonly hostModel: Model<HostDocument>,
  ) {}

  @MessagePattern({ cmd: 'create_host' })
  async createHost(createHostDto: CreateHostDto) {
    try {
      const host = await this.hostService.createHost(createHostDto);
      return { statusCode: 201, data: host };
    } catch (err) {
      return { statusCode: err.status || 400, data: null, error: err.message };
    }
  }

  @MessagePattern({ cmd: 'verify_email' })
  async verifyEmailMicroservice(@Payload() data: { token: string, debug?: boolean }) {
    this.logger.log('Processing email verification request');
    
    const debug = data.debug === true;
    if (debug) {
      this.logger.log(`Debug mode enabled for verification`);
    }
    
    try {
      if (!data || !data.token) {
        this.logger.warn('Token is missing in verify_email payload');
        throw new RpcException({
          message: 'Token is missing',
          status: HttpStatus.BAD_REQUEST
        });
      }
      
      // Log token information for debugging
      if (debug) {
        this.logger.log(`Token length: ${data.token.length}`);
        
        // Get the secret key and log its length
        const secretKey = this.emailService.getSecretKey();
        this.logger.log(`Secret key length in microservice: ${secretKey.length}`);
        
        // Try to decode the token without verification first
        try {
          const decodedWithoutVerification = jwt.decode(data.token);
          this.logger.log('Token can be decoded without verification:', decodedWithoutVerification);
        } catch (decodeError) {
          this.logger.warn('Failed to decode token without verification:', decodeError.message);
        }
      }
      
      this.logger.log('Verifying JWT token');
      
      // Verify the token
      let decoded;
      try {
        const secretKey = this.emailService.getSecretKey();
        decoded = jwt.verify(data.token, secretKey) as JwtPayload;
        
        // Check if token is for email verification
        if (decoded.purpose !== 'email-verification') {
          throw new RpcException({
            message: 'Invalid token purpose',
            status: HttpStatus.BAD_REQUEST
          });
        }
      } catch (jwtError) {
        this.logger.warn(`JWT verification failed in microservice: ${jwtError.message}`);
        throw new RpcException({
          message: `Invalid or expired verification token: ${jwtError.message}`,
          status: HttpStatus.BAD_REQUEST
        });
      }
      
      this.logger.log(`JWT decoded for email: ${decoded.email}`);
      
      // FIXED - Correct way to query MongoDB with Mongoose
      try {
        // Find user directly without 'where' clause
        const user = await this.hostModel.findOne({ email: decoded.email });
        
        if (!user) {
          this.logger.warn(`Host not found for email: ${decoded.email}`);
          throw new RpcException({
            message: 'Host not found',
            status: HttpStatus.NOT_FOUND
          });
        }
        
        // Update the emailVerified field
        user.emailVerified = true;
        await user.save();
        
        this.logger.log(`Host email verification status updated for: ${decoded.email}`);
        
        // OPTIONAL: Also update Firebase email verification status
        try {
          // If you're using Firebase Auth, update there too
          if (user.firebaseUid) {
            await this.firebaseAdminService.firebaseApp.auth().updateUser(user.firebaseUid, {
              emailVerified: true
            });
            
            // Update custom claims too if needed
            await this.firebaseAdminService.firebaseApp.auth().setCustomUserClaims(user.firebaseUid, {
              role: "host", // preserve existing claims
              emailVerified: true
            });
            
            this.logger.log(`Firebase email verification status updated for UID: ${user.firebaseUid}`);
          }
        } catch (firebaseError) {
          // Log but don't fail if Firebase update fails
          this.logger.warn(`Failed to update Firebase verification status: ${firebaseError.message}`);
        }
        
      } catch (dbError) {
        if (dbError instanceof RpcException) {
          throw dbError;
        }
        this.logger.error(`Failed to update user verification status: ${dbError.message}`);
        throw new RpcException({
          message: 'Failed to update verification status',
          status: HttpStatus.INTERNAL_SERVER_ERROR
        });
      }
      
      // At the end of successful verification
      this.logger.log('Email verification completed successfully');
      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      // If the error is not already an RpcException, convert it
      if (!(error instanceof RpcException)) {
        this.logger.error('Email verification failed with unexpected error:', error);
        throw new RpcException({
          message: error.message || 'Email verification failed',
          status: HttpStatus.INTERNAL_SERVER_ERROR
        });
      }
      
      // Otherwise propagate it as is
      throw error;
    }
  }

  // Add this method to your microservice class to handle sending verification emails

@MessagePattern({ cmd: 'send_verification_email' })
async sendVerificationEmail(@Payload() data: { email: string, userId: string }) {
  this.logger.log(`Processing request to send verification email to: ${data.email}`);
  
  try {
    if (!data || !data.email || !data.userId) {
      this.logger.warn('Missing required data for sending verification email');
      throw new RpcException({
        message: 'Email and userId are required',
        status: HttpStatus.BAD_REQUEST
      });
    }
    
    // First check if host exists and is not already verified
    const host = await this.hostModel.findById(data.userId);
    
    if (!host) {
      this.logger.warn(`Host not found with ID: ${data.userId}`);
      throw new RpcException({
        message: 'Host not found',
        status: HttpStatus.NOT_FOUND
      });
    }
    
    if (host.emailVerified) {
      this.logger.log(`Host email is already verified: ${data.email}`);
      return {
        success: true,
        message: 'Email is already verified',
        alreadyVerified: true
      };
    }
    
    // Generate a new verification token with 'purpose' field
    const verificationToken = jwt.sign(
      {
        email: data.email,
        userId: data.userId,
        purpose: 'email-verification' // Add purpose to token for more security
      },
      this.emailService.getSecretKey(),
      { expiresIn: '24h' }
    );
    
    // Send the verification email
    await this.emailService.sendVerificationEmail(data.email, data.userId);
    
    this.logger.log(`Verification email sent to: ${data.email}`);
    return {
      success: true,
      message: 'Verification email sent successfully'
    };
  } catch (error) {
    this.logger.error(`Failed to send verification email: ${error.message}`);
    
    if (!(error instanceof RpcException)) {
      throw new RpcException({
        message: error.message || 'Failed to send verification email',
        status: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
    
    throw error;
  }
}

// Also add this method to find a host by email
@MessagePattern({ cmd: 'find_host_by_email' })
async findHostByEmail(@Payload() data: { email: string }) {
  this.logger.log(`Finding host with email: ${data.email}`);
  
  try {
    if (!data || !data.email) {
      this.logger.warn('Email is missing in find_host_by_email payload');
      throw new RpcException({
        message: 'Email is required',
        status: HttpStatus.BAD_REQUEST
      });
    }
    
    const host = await this.hostModel.findOne({ email: data.email });
    
    if (!host) {
      this.logger.warn(`Host not found with email: ${data.email}`);
      return null;
    }
    
    return host;
  } catch (error) {
    this.logger.error(`Error finding host by email: ${error.message}`);
    
    if (!(error instanceof RpcException)) {
      throw new RpcException({
        message: error.message || 'Failed to find host',
        status: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
    
    throw error;
  }
}

  @MessagePattern({ cmd: 'login_host' })
  async loginHost(data: { idToken?: string; email?: string; password?: string }) {
    try {
      const response = await this.hostService.loginHost(data.idToken || '', data.email || '', data.password || '');
      return { statusCode: 200, data: response };
    } catch (err) {
      return { statusCode: err.status || 401, data: null, error: err.message };
    }
  }

  @MessagePattern({ cmd: 'verify_token' })
  async verifyToken(data: { token: string }) {
    try {
      const decodedToken = await this.hostService.verifyToken(data.token);
      return { statusCode: 200, data: decodedToken };
    } catch (err) {
      return { statusCode: 401, data: null, error: err.message };
    }
  }

  @MessagePattern({ cmd: 'login_google_host' })
  async loginGoogleHost(data: { idToken: string }) {
    try {
      const response = await this.hostService.loginGoogleHost(data.idToken);
      return { statusCode: 200, data: response };
    } catch (err) {
      return { statusCode: err.status || 401, data: null, error: err.message || "Erreur lors de l'authentification via Google" };
    }
  }

  @MessagePattern({ cmd: 'get_hosts' })
  async getHosts() {
    try {
      const hosts = await this.hostService.getHosts();
      return { statusCode: 200, data: hosts };
    } catch (err) {
      return { statusCode: err.status || 500, data: null, error: err.message };
    }
  }

  @MessagePattern({ cmd: 'get_host_by_id' })
  async getHostById(data: { id: string }) {
    try {
      const host = await this.hostService.getHostById(data.id);
      return { statusCode: 200, data: host };
    } catch (err) {
      return { statusCode: err.status || 404, data: null, error: err.message };
    }
  }

  @MessagePattern({ cmd: 'update_host' })
  async updateHost(data: { id: string; updateHostDto: Partial<CreateHostDto> }) {
    try {
      const updatedHost = await this.hostService.updateHost(data.id, data.updateHostDto);
      return { statusCode: 200, data: updatedHost };
    } catch (err) {
      return { statusCode: err.status || 400, data: null, error: err.message };
    }
  }

  @MessagePattern({ cmd: 'get_host_by_token' })
  async handleGetHostByToken(@Payload() data: { token: string }) {
    try {
      // 1. Vérifier le token Firebase
      const decoded = await this.hostService.verifyToken(data.token);

      if (!decoded.email) {
        return {
          statusCode: 400,
          error: 'Email non trouvé dans le token'
        };
      }

      // 2. Chercher l'hôte dans la DB par email
      const host = await this.hostService.getHostByEmail(decoded.email);
      
      // 3. Retourner le profil
      return {
        statusCode: 200,
        data: host
      };
    } catch (err) {
      console.error('Erreur dans get_host_by_token:', err);
      return {
        statusCode: err.status || 401,
        error: err.message || 'Token invalide ou expiré'
      };
    }
  }

  @MessagePattern({ cmd: 'get_host_by_email' })
  async getHostByEmail(data: { email: string }) {
    try {
      const host = await this.hostService.getHostByEmail(data.email);
      return { statusCode: 200, data: host };
    } catch (err) {
      return { statusCode: err.status || 404, data: null, error: err.message };
    }
  }

  @MessagePattern({ cmd: 'get-host-by-firebase-id' })
  async getHostByFirebaseId(firebaseUid: string) {
    try {
      const host = await this.hostService.findByFirebaseId(firebaseUid);
      if (!host) {
        return { statusCode: 404, data: null, error: 'Host not found' };
      }
      return { statusCode: 200, data: host };
    } catch (err) {
      return { statusCode: err.status || 500, data: null, error: err.message };
    }
  }

  @MessagePattern({ cmd: 'send_reset_password_email' })
  async sendResetPasswordEmail(@Payload() payload: { email: string }) {
    const email = payload.email;
    
    if (!email) {
      return {
        status: 'error',
        message: 'Email address is required',
        error: 'EMAIL_REQUIRED'
      };
    }
    
    try {
      const user = await this.hostService.findOneByEmail(email);
      if (!user) {
        return {
          status: 'error',
          message: 'No account found with this email address',
          error: 'USER_NOT_FOUND'
        };
      }
      
      await this.emailService.sendResetPasswordEmail(email);
      return {
        status: 'success',
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        status: 'error',
        message: 'Error sending the email',
        error: 'EMAIL_SEND_ERROR'
      };
    }
  }
  
  @MessagePattern({ cmd: 'validate_token' })
  async validateToken(@Payload() data: { token: string }) {
    const { token } = data;
    if (!token) {
      return { error: '⚠️ Missing token' };
    }

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
    if (!token || !newPassword) {
      return { error: '⚠️ Missing token or new password' };
    }

    try {
      const success = await this.emailService.resetPassword(token, newPassword);
      if (success) {
        return { message: '✅ Password reset successfully' };
      } else {
        return { error: '❌ Error during password reset' };
      }
    } catch (error) {
      console.error('❌ Error during password reset:', error);
      return { error: '⛔ Invalid or expired token' };
    }
  }

  @MessagePattern({ cmd: 'change_password' })
  async changePassword(@Payload() data: { userId: string; newPassword: string }) {
    if (!data.userId || !data.newPassword) {
      return { 
        statusCode: HttpStatus.BAD_REQUEST, 
        message: 'User ID and new password are required' 
      };
    }

    try {
      // Get user by Firebase UID
      const user = await this.hostService.findByFirebaseId(data.userId);
      if (!user) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found'
        };
      }

      // Update password in Firebase
      const result = await this.hostService.updatePasswordInFirebase(user.email, data.newPassword);
      
      if (result) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Password updated successfully'
        };
      } else {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to update password'
        };
      }
    } catch (error) {
      console.error('Error changing password:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Error updating password: ${error.message}`
      };
    }
  }

  @MessagePattern({ cmd: 'delete_host' })
  async deleteHost(@Payload() data: { idToken: string, firebaseUid: string }) {
    try {
      if (!data.idToken || !data.firebaseUid) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Token and Firebase UID are required'
        };
      }
      
      const result = await this.hostService.deleteHost(data.idToken, data.firebaseUid);
      
      return {
        statusCode: HttpStatus.OK,
        message: result.message
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message || 'Failed to delete user'
      };
    }
  }
}