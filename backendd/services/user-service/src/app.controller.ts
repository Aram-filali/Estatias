import { Controller, HttpException, HttpStatus, BadRequestException,  Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { UserService } from './app.service';
import { FirebaseAdminService } from './firebase/firebase';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './forgetPassword/email.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetProfileDto } from './dto/getProfile-user.dto';
import { JwtPayload } from 'jsonwebtoken';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { Model } from 'mongoose';


@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(
    private readonly userService: UserService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @MessagePattern({ cmd: 'signup_user' })
  async signupUser(@Payload() body: CreateUserDto) {
    const fullname = body.fullname || '';
    const password = body.password ?? '';
    const role = body.role ?? 'user';

    if (typeof body.email !== 'string') {
      throw new RpcException({
        message: 'Invalid email',
        statusCode: HttpStatus.BAD_REQUEST
      });
    }

    const userExists = await this.userService.findOneByEmail(body.email);
    if (userExists) {
      throw new RpcException({
        message: 'User already exists',
        statusCode: HttpStatus.BAD_REQUEST
      });
    }

    try {
      const newUser = await this.userService.signupUser(fullname, body.email, password);
      
      const payload = { email: newUser.email, sub: newUser._id, role: newUser.role };
      const accessToken = this.jwtService.sign(payload);
      
      return { 
        message: 'User created successfully', 
        access_token: accessToken, 
        user: newUser 
      };
    } catch (error) {
      console.error('Error during signup:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already exists')) {
        throw new RpcException({
          message: error.message,
          statusCode: HttpStatus.CONFLICT
        });
      }
      
      throw new RpcException({
        message: error.message || 'Error during user signup',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      });
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
    } catch (jwtError) {
      this.logger.warn(`JWT verification failed in microservice: ${jwtError.message}`);
      throw new RpcException({
        message: ` Expired verification link : ${jwtError.message}`,
        status: HttpStatus.BAD_REQUEST
      });
    }
    
    this.logger.log(`JWT decoded for email: ${decoded.email}`);
    
    // FIXED - Correct way to query MongoDB with Mongoose
    try {
      // Find user directly without 'where' clause
      const user = await this.userModel.findOne({ email: decoded.email });
      
      if (!user) {
        this.logger.warn(`User not found for email: ${decoded.email}`);
        throw new RpcException({
          message: 'User not found',
          status: HttpStatus.NOT_FOUND
        });
      }
      
      // Update the emailVerified field
      user.emailVerified = true;
      await user.save();
      
      this.logger.log(`User email verification status updated for: ${decoded.email}`);
      
      // OPTIONAL: Also update Firebase email verification status
      try {
        // If you're using Firebase Auth, update there too
        if (user.firebaseUid) {
          await this.firebaseAdminService.firebaseApp.auth().updateUser(user.firebaseUid, {
            emailVerified: true
          });
          
          // Update custom claims too if needed
          await this.firebaseAdminService.firebaseApp.auth().setCustomUserClaims(user.firebaseUid, {
            role: "user", // preserve existing claims
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

 @MessagePattern({ cmd: 'login_user' })
  async loginUser(@Payload() body: { idToken?: string, email?: string, password?: string }) {
    try {
      console.log('Login request received:', { hasIdToken: !!body.idToken });
      
      if (body.idToken) {
        const userResult = await this.userService.loginUser(body.idToken, '', '');
        return {
          message: 'Authentication successful',
          user: userResult,
          role: userResult.role
        };
      }
      
      throw new RpcException({
        message: 'No valid authentication method provided',
        status: HttpStatus.BAD_REQUEST
      });
      
    } catch (error) {
      console.error('Microservice Login error:', error);
      
      // Convert HttpException to RpcException for proper microservice communication
      if (error instanceof HttpException) {
        throw new RpcException({
          message: error.message,
          status: error.getStatus()
        });
      }
      
      // Handle other errors
      throw new RpcException({
        message: error.message || 'Authentication failed',
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
  }

  @MessagePattern({ cmd: 'signup_google_user' })
  async signupGoogle(@Payload() data: { idToken: string }) {
    try {
      if (!data.idToken) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Token manquant'
        };
      }

      const result = await this.userService.signupGoogleUser(data.idToken);
      
      return {
        statusCode: HttpStatus.OK,
        message: result.message,
        user: result.user
      };
    } catch (error) {
      console.error('Google signup error:', error);
      return {
        statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message || 'Erreur lors de l\'inscription Google'
      };
    }
  }

  @MessagePattern({ cmd: 'login_google_user' })
  async loginGoogle(@Payload() data: { idToken: string }) {
    try {
      if (!data.idToken) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Token manquant'
        };
      }

      const result = await this.userService.loginGoogleUser(data.idToken);
      
      return {
        statusCode: HttpStatus.OK,
        message: result.message,
        user: result.user,
        role: result.role
      };
    } catch (error) {
      console.error('Google login error:', error);
      return {
        statusCode: error.status || HttpStatus.UNAUTHORIZED,
        error: error.message || 'Échec de l\'authentification Google'
      };
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
      const user = await this.userService.findOneByEmail(email);
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

  /*@MessagePattern({ cmd: 'test_email_delivery' })
  async testEmailDelivery(@Payload() data: { testEmail: string }) {
    try {
      if (!data.testEmail) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Email address is required'
        };
      }
      
      await this.emailService.sendTestEmail(data.testEmail);
      
      return {
        statusCode: HttpStatus.OK,
        message: 'Test email sent successfully'
      };
    } catch (error) {
      console.error('Test email error:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message || 'Failed to send test email'
      };
    }
  }*/

  @MessagePattern({ cmd: 'validate_token' })
  async validateResetToken(@Payload() data: { token: string }) {
    try {
      if (!data.token) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Token is required'
        };
      }
      
      // Verify token
      const payload = this.jwtService.verify(data.token);
      
      return {
        statusCode: HttpStatus.OK,
        message: 'Valid token',
        email: payload.email
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Invalid or expired token'
      };
    }
  }

  @MessagePattern({ cmd: 'reset_password' })
  async resetPassword(@Payload() data: { token: string; newPassword: string }) {
    try {
      if (!data.token || !data.newPassword) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Token and new password are required'
        };
      }
      
      // Verify token
      const payload = this.jwtService.verify(data.token);
      
      // Get user by email
      const user = await this.userService.findOneByEmail(payload.email);
      if (!user) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'User not found'
        };
      }
      
      // Update password in Firebase
      const firebaseUser = await this.userService.updatePasswordInFirebase(
        payload.email,
        data.newPassword
      );
      
      if (!firebaseUser) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to update password in Firebase'
        };
      }
      
      return {
        statusCode: HttpStatus.OK,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Reset token has expired'
        };
      }
      
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message || 'Failed to reset password'
      };
    }
  }

  @MessagePattern({ cmd: 'test_signin' })
  async testSignIn() {
    try {
      // Just a simple status check
      return {
        statusCode: HttpStatus.OK,
        message: 'Test sign-in endpoint working'
      };
    } catch (error) {
      console.error('Test sign-in error:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message || 'Test sign-in failed'
      };
    }
  }

  @MessagePattern({ cmd: 'verify_token' })
  async verifyToken(@Payload() idToken: string) {
    try {
      const decodedToken = await this.userService.verifyToken(idToken);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        error: error.message || 'Invalid token',
        statusCode: HttpStatus.UNAUTHORIZED
      };
    }
  }

  @MessagePattern({ cmd: 'update_user_profile' })
  async updateUserProfile(@Payload() data: { updateUserDto: UpdateUserDto }) {
      try {
          if (!data.updateUserDto || !data.updateUserDto.firebaseUid) {
              throw new BadRequestException('Update data is incomplete');
          }
          
          const updatedUser = await this.userService.updateUser(data.updateUserDto);
          
          return {
              statusCode: HttpStatus.OK,
              message: 'User profile updated successfully',
              user: updatedUser
          };
      } catch (error) {
          // Preserve original status code if available
          const statusCode = error.status || 
                           (error.response?.status) || 
                           HttpStatus.INTERNAL_SERVER_ERROR;
          
          // Return proper error response
          return {
              statusCode,
              error: error.message,
              message: error.response?.data?.message || error.message
          };
      }
  }

  @MessagePattern({ cmd: 'delete_user' })
  async deleteUser(@Payload() data: { idToken: string, firebaseUid: string }) {
      try {
          if (!data.idToken || !data.firebaseUid) {
              return {
                  statusCode: HttpStatus.BAD_REQUEST,
                  error: 'Token and Firebase UID are required'
              };
          }
          
          const result = await this.userService.deleteUser(data.idToken, data.firebaseUid);
          
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
  @MessagePattern({ cmd: 'change_password' })
  async changePassword(@Payload() data: { firebaseUid: string, newPassword: string, currentPassword?: string }) {
    try {
      if (!data.firebaseUid || !data.newPassword) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Firebase UID and new password are required'
        };
      }
      
      const result = await this.userService.changePassword(
        data.firebaseUid,
        data.newPassword,
        data.currentPassword
      );
      
      if (!result.success) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: result.message
        };
      }
      
      return {
        statusCode: HttpStatus.OK,
        message: result.message
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: error.message || 'Failed to change password'
      };
    }
  }

  @MessagePattern({ cmd: 'get_profile' })
  async getProfile(@Payload() getProfileDto: GetProfileDto) {
    try {
      return await this.userService.getProfile(getProfileDto.idToken);
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to get user profile',
        status: error.status || 500
      };
    }
  }
}




