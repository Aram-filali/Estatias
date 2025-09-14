import { Controller, Post, Body, Inject, HttpException, HttpStatus, Get, Param, Query, Patch, Res, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ForgotPasswordDto } from './forgetpass.dto';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { User } from '../decorator/user.decorator';
import { Response } from 'express'; 
import * as jwt from 'jsonwebtoken';


@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name); // Added logger

  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {}

  @Post('signup')
  async signupUser(@Body() createUserDto: any) {
    try {
      const response = await firstValueFrom(
        this.userClient.send({ cmd: 'signup_user' }, createUserDto)
      );
      return response;
    } catch (error) {
      // Extract status code safely
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      
      if (error.status && typeof error.status === 'number') {
        statusCode = error.status;
      } else if (error.statusCode && typeof error.statusCode === 'number') {
        statusCode = error.statusCode;
      }
      
      throw new HttpException(
        error.message || 'Error during user creation',
        statusCode
      );
    }
  }

  @Get('verify-email')
  async verifyEmailGet(@Query('token') token: string, @Res() res: Response) {
    this.logger.log(`Received GET verification request with token: ${token ? 'exists' : 'missing'}`);
    
    // Check if the client URL is correctly configured
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3002';
    
    if (!token) {
      this.logger.warn('Token is missing in verify-email GET request');
      return res.redirect(`${clientUrl}/verification-error?message=Token%20is%20missing`);
    }

    try {
      // Verify the token (direct implementation)
      const secretKey = this.getSecretKey();
      
      if (!secretKey) {
        throw new Error('JWT secret key is not configured');
      }
      
      try {
        // Verify JWT token first
        this.logger.log('Verifying JWT token');
        // Import JWT directly at the top of the file
        const decoded = jwt.verify(token, secretKey);
        
        if (!decoded) {
          throw new Error('Token verification failed');
        }
        
        this.logger.log('JWT token verified successfully');
      } catch (jwtError) {
        this.logger.warn(`JWT verification failed: ${jwtError.message}`);
        return res.redirect(`${clientUrl}/verification-error?message=${encodeURIComponent('Expired verification link')}`);
      }
      
      this.logger.log('Sending verification request to microservice');
      
      // Send request to the microservice
      const response = await firstValueFrom(
        this.userClient.send({ cmd: 'verify_email' }, { token })
      );
      
      this.logger.log('Verification successful, redirecting to success page');

      // Redirect user to the success page
      return res.redirect(`${clientUrl}/email-verified`);
    } catch (error) {
      // Improved error handling
      this.logger.error('Email verification failed:', error);
      
      // Extract the most relevant error message
      let errorMessage = 'Verification failed';
      
      if (error.response && error.response.message) {
        // Standard RpcException format
        errorMessage = error.response.message;
      } else if (error.message) {
        // Standard error with message
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        // Error as a string
        errorMessage = error;
      }
      
      this.logger.warn(`Redirecting to error page with message: ${errorMessage}`);
      
      // Redirect to the error page with the message
      return res.redirect(`${clientUrl}/verification-error?message=${encodeURIComponent(errorMessage)}`);
    }
  }
  
  // Handle AJAX verification requests from the frontend app (POST request with token in body)
  @Post('verify-email')
  async verifyEmail(@Body() body: { token: string }) {
    this.logger.log('Received email verification request');
    
    if (!body || !body.token) {
      this.logger.warn('No token provided in request');
      throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Appel au microservice pour vérifier l'email
      const result = await firstValueFrom(
        this.userClient.send(
          { cmd: 'verify_email' },
          { token: body.token, debug: false }
        )
      );

      this.logger.log('Email verification successful');
      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      this.logger.error(`Email verification failed: ${error.message}`);
      
      // Déterminer le code d'état à renvoyer basé sur l'erreur
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      if (error.status) {
        statusCode = error.status;
      } else if (error.message && error.message.includes('expired')) {
        statusCode = HttpStatus.BAD_REQUEST;
      }

      throw new HttpException(
        error.message || 'Email verification failed',
        statusCode
      );
    }
  }  
  private getSecretKey(): string {
    const secretKey = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'fallbackSecretKey';
    
    if (!secretKey) {
      this.logger.error('JWT_SECRET_KEY is not defined in environment variables');
      return 'fallbackSecretKey';
    }
    
    // Log the key length to help with debugging (not the actual key)
    this.logger.debug(`Using secret key with length: ${secretKey.length}`);
    
    return secretKey;
  }

  @Get('test-jwt')
async testJwt() {
  const secretKey = this.getSecretKey();
  
  try {
    // Create a test token
    const testToken = jwt.sign(
      { test: 'data', timestamp: Date.now() },
      secretKey,
      { expiresIn: '1h' }
    );
    
    // Try to verify it immediately
    try {
      const verified = jwt.verify(testToken, secretKey);
      
      return {
        success: true,
        message: 'JWT signing and verification working correctly',
        token: testToken,
        secretKeyLength: secretKey.length,
        verified: verified
      };
    } catch (verifyError) {
      return {
        error: true,
        message: 'JWT verification failed',
        verifyError: verifyError.message,
        token: testToken,
        secretKeyLength: secretKey.length
      };
    }
  } catch (error) {
    return {
      error: true,
      message: 'JWT test failed',
      errorDetails: error.message,
      secretKeyLength: secretKey.length
    };
  }
}

  @Post('login')
async loginUser(@Body() credentials: { idToken?: string, email?: string, password?: string }) {
  try {
    const response = await firstValueFrom(
      this.userClient.send({ cmd: 'login_user' }, credentials)
    );
    return response;
  } catch (error) {
    console.error('API Gateway Login Error:', error);
    
    // Handle microservice errors properly
    if (error.status && typeof error.status === 'number') {
      throw new HttpException(
        error.message || 'Authentication failed',
        error.status
      );
    }
    
    // Handle RpcException errors from microservices
    if (error.error && error.error.status) {
      throw new HttpException(
        error.error.message || error.message || 'Authentication failed',
        error.error.status
      );
    }
    
    // Default error handling
    throw new HttpException(
      error.message || 'Authentication failed',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

  @Post('signup-google')
  async signupGoogle(@Body('idToken') idToken: string) {
    if (!idToken) {
      throw new HttpException('Token manquant', HttpStatus.BAD_REQUEST);
    }
  
    try {
      const response = await firstValueFrom(
        this.userClient.send({ cmd: 'signup_google_user' }, { idToken }),
      );
  
      if (response.statusCode === 200) {
        return {
          message: response.message,
          user: response.user,
        };
      } else {
        throw new HttpException(response.error || 'Erreur de création via Google', response.statusCode);
      }
    } catch (error) {
      throw new HttpException(error.message || 'Erreur microservice', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  @Post('login-google')
  async loginGoogle(@Body() data: { idToken: string }) {
    if (!data.idToken) {
      throw new HttpException('Token manquant', HttpStatus.BAD_REQUEST);
    }
  
    try {
      const response = await firstValueFrom(
        this.userClient.send({ cmd: 'login_google_user' }, data)
      );
  
      if (response.statusCode === 200) {
        return {
          message: response.message,
          user: response.user,
          role: response.role, 
        };
      } else {
        throw new HttpException(response.error || 'Erreur de login Google', response.statusCode);
      }
    } catch (error) {
      throw new HttpException(
        error.message || 'Authentication failed',
        error.status || HttpStatus.UNAUTHORIZED
      );
    }
  }
  
  @Post('forgot-password')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    try {
      const response = await firstValueFrom(
        this.userClient.send(
          { cmd: 'send_reset_password_email' }, 
          { email: data.email } // Pass the email as an object property
        ),
      );
  
      if (response.error) {
        throw new HttpException(response.message, HttpStatus.BAD_REQUEST);
      }
  
      return response;
    } catch (error) {
      throw new HttpException(
        error.response?.message || error.message || 'Failed to send reset password email',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('test-email')
  async testEmailDelivery(@Body() data: { testEmail: string }) {
    try {
      const response = await firstValueFrom(
        this.userClient.send({ cmd: 'test_email_delivery' }, { testEmail: data.testEmail })
      );
      
      if (response.error) {
        throw new HttpException(response.error, HttpStatus.BAD_REQUEST);
      }
      
      return response;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send test email',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('validate-reset-token')
  async validateResetToken(@Query('token') token: string) {
    try {
      const response = await firstValueFrom(
        this.userClient.send({ cmd: 'validate_token' }, { token })
      );
      
      if (response.error) {
        throw new HttpException(response.error, HttpStatus.BAD_REQUEST);
      }
      
      return response;
    } catch (error) {
      throw new HttpException(
        error.message || 'Invalid or expired token',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() data: { token: string; newPassword: string }) {
    try {
      const response = await firstValueFrom(
        this.userClient.send({ cmd: 'reset_password' }, data)
      );
      
      if (response.error) {
        throw new HttpException(response.error, HttpStatus.BAD_REQUEST);
      }
      
      return response;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to reset password',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('test-signin')
  async testSignIn() {
    try {
      const response = await firstValueFrom(
        this.userClient.send({ cmd: 'test_signin' }, {})
      );
      return response;
    } catch (error) {
      throw new HttpException(
        error.message || 'Test sign-in failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch('update-user')
  async updateUserProfile(
      @Body() { idToken, updateUserDto }: { idToken: string; updateUserDto: any },
  ) {
      // Validate input
      if (!idToken) {
          throw new HttpException('ID token is required', HttpStatus.BAD_REQUEST);
      }
    
      if (!updateUserDto || !updateUserDto.firebaseUid) {
          throw new HttpException('Update data or Firebase UID is missing', HttpStatus.BAD_REQUEST);
      }
    
      try {
          // Verify token
          const tokenResponse = await firstValueFrom(
              this.userClient.send({ cmd: 'verify_token' }, idToken)
          );
          
          if (tokenResponse.error || !tokenResponse.uid) {
              throw new HttpException(
                  tokenResponse.error || 'Invalid or expired token',
                  tokenResponse.statusCode || HttpStatus.UNAUTHORIZED
              );
          }
    
          // Verify user can only update their own profile
          if (tokenResponse.uid !== updateUserDto.firebaseUid) {
              throw new HttpException(
                  'You can only update your own profile',
                  HttpStatus.FORBIDDEN
              );
          }
    
          // Call user service
          const response = await firstValueFrom(
              this.userClient.send({ cmd: 'update_user_profile' }, { updateUserDto })
          );
    
          // Handle error responses
          if (response.error || response.statusCode !== HttpStatus.OK) {
              throw new HttpException(
                  response.message || response.error || 'Error updating profile',
                  response.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
              );
          }
    
          return {
              message: 'Profile updated successfully',
              user: response.user,
          };
      } catch (error) {
          console.error('Update profile error:', error);
          
          // Preserve original status code if available
          const statusCode = error.status || 
                           error.response?.status || 
                           HttpStatus.INTERNAL_SERVER_ERROR;
          
          // Provide more specific error messages
          let errorMessage = error.message || 'Unexpected error during profile update';
          
          if (error.message.includes('Current password is incorrect')) {
              errorMessage = 'The current password you entered is incorrect';
          } else if (error.message.includes('Password must be at least 6 characters')) {
              errorMessage = 'Password must be at least 6 characters long';
          } else if (error.message.includes('EMAIL_REQUIRED')) {
              errorMessage = 'Email is required for password verification';
          }
          
          throw new HttpException(errorMessage, statusCode);
      }
  }

  @Post('delete-user')
  async deleteUserAccount(@Body() data: { idToken: string, firebaseUid: string }) {
    // Validate data
    if (!data.idToken) {
      throw new HttpException('Token missing', HttpStatus.BAD_REQUEST);
    }
    
    if (!data.firebaseUid) {
      throw new HttpException('Firebase UID missing', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const response = await firstValueFrom(
        this.userClient.send({ cmd: 'delete_user' }, data)
      );
      
      if (response.statusCode === 200) {
        return {
          message: response.message
        };
      } else {
        throw new HttpException(
          response.error || 'Error deleting account', 
          response.statusCode
        );
      }
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete account',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post('change-password')
  async changePassword(@Body() data: { idToken: string, newPassword: string, currentPassword?: string }) {
    // Validate data
    if (!data.idToken || !data.newPassword) {
      throw new HttpException('Token and new password are required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      // First verify the token to get the user's Firebase UID
      const decodedToken = await firstValueFrom(
        this.userClient.send({ cmd: 'verify_token' }, data.idToken)
      );
      
      if (!decodedToken || !decodedToken.uid) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }
      
      // Now use the verified Firebase UID
      const response = await firstValueFrom(
        this.userClient.send(
          { cmd: 'change_password' }, 
          {
            firebaseUid: decodedToken.uid,
            newPassword: data.newPassword,
            currentPassword: data.currentPassword
          }
        )
      );
      
      if (response.statusCode === 200) {
        return {
          message: response.message
        };
      } else {
        throw new HttpException(
          response.error || 'Error changing password',
          response.statusCode
        );
      }
    } catch (error) {
      console.error('Password change error:', error);
      throw new HttpException(
        error.message || 'Failed to change password',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  async getProfile(@Body() body: { idToken: string }) {
    try {
      if (!body.idToken) {
        throw new HttpException('ID token is required', HttpStatus.BAD_REQUEST);
      }

      const response = await firstValueFrom(
        this.userClient.send(
          { cmd: 'get_profile' },
          { idToken: body.idToken }
        )
      );

      if (!response.success) {
        throw new HttpException(
          response.message || 'Failed to get profile',
          response.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return response;
    } catch (error) {
      console.error('Error in profile controller:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        error.message || 'Failed to process profile request',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}