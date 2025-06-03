import { Controller, Post, Body, Inject, HttpException, Get, Param, Res, Patch, Delete, Headers, UnauthorizedException, UploadedFile, HttpStatus, Query, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ForgotPasswordDto } from './forgetpass.dto';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFiles } from '@nestjs/common';
import { Express } from 'express';
import { Response } from 'express';
//import { AuthGuard } from '../guards/auth.guard';
import * as jwt from 'jsonwebtoken';


@Controller('hosts')
export class HostController {
  private readonly logger = new Logger(HostController.name);
  constructor(
    @Inject('HOST_SERVICE') private readonly hostClient: ClientProxy,
    @Inject('HOST_PLAN_SERVICE') private readonly hostPlanClient: ClientProxy, 
    @Inject('DASHBOARD_SERVICE') private readonly dashboardClient: ClientProxy, 
    @Inject('SETTINGS_SERVICE') private readonly settingsClient: ClientProxy, 
  ) {}

  @Post()
  async createHost(@Body() createHostDto: any) {
    try {
      const response = await firstValueFrom(
        this.hostClient.send(
          { cmd: 'create_host' },
          createHostDto 
        )
      );
    
      if (response.statusCode !== 201) {
        throw new HttpException(
          response.error || 'Erreur lors de la création de l\'hôte',
          response.statusCode
        );
      }
    
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur lors de la création de l\'hôte',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
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
          this.hostClient.send(
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


  // Add this to your controller where the verify-email endpoint exists

// Add this endpoint to your host controller

@Post('resend-verification')
async resendVerificationEmail(@Body() body: { email: string }) {
  this.logger.log(`Received request to resend verification email to: ${body.email}`);
  
  if (!body || !body.email) {
    this.logger.warn('No email provided in request');
    throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
  }
  
  try {
    // Validate email format
    if (!this.isValidEmail(body.email)) {
      this.logger.warn(`Invalid email format: ${body.email}`);
      throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
    }
    
    // Find the host in your database first
    const host = await firstValueFrom(
      this.hostClient.send(
        { cmd: 'find_host_by_email' },
        { email: body.email }
      )
    );
    
    if (!host) {
      this.logger.warn(`Host not found for email: ${body.email}`);
      // For security reasons, don't tell the user the account doesn't exist
      return {
        success: true,
        message: 'If your email exists in our system, a verification link has been sent.'
      };
    }
    
    // Check if the email is already verified
    if (host.emailVerified) {
      this.logger.log(`Email ${body.email} is already verified`);
      return {
        success: true,
        message: 'Your email is already verified. You can proceed to login.'
      };
    }
    
    // Generate and send new verification email
    const result = await firstValueFrom(
      this.hostClient.send(
        { cmd: 'send_verification_email' },
        { email: body.email, userId: host._id }
      )
    );
    
    this.logger.log(`Verification email resent to: ${body.email}`);
    return {
      success: true,
      message: 'Verification email has been sent. Please check your inbox.'
    };
  } catch (error) {
    this.logger.error(`Failed to resend verification email: ${error.message}`);
    
    // Don't expose sensitive error details to the client
    throw new HttpException(
      'Failed to resend verification email. Please try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

// Helper method to validate email format
private isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

  @Post('login-host')
  async loginHost(@Body() data: { idToken?: string; email?: string; password?: string }) {
    try {
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'login_host' }, data)
      );

      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Erreur de connexion de l\'hôte',
          response.statusCode
        );
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur de connexion',
        error.status || HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Post('verify-token')
  async verifyToken(@Body() data: { token: string }) {
    try {
      if (!data.token) {
        throw new HttpException('Token est requis', HttpStatus.BAD_REQUEST);
      }
      
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'verify_token' }, data)
      );

      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Token invalide',
          response.statusCode
        );
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur de vérification du token',
        error.status || HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Post('google-host')
  async loginGoogle(@Body() data: { idToken: string }) {
    try {
      if (!data.idToken) {
        throw new HttpException('Token est requis', HttpStatus.BAD_REQUEST);
      }
      
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'login_google_host' }, data)
      );

      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Erreur de connexion via Google',
          response.statusCode
        );
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.message || 'Erreur de connexion via Google',
        error.status || HttpStatus.UNAUTHORIZED
      );
    }
  }

  // Nouvel endpoint qui était manquant
  @Get('me')
  async getHostByToken(@Headers('authorization') authorization: string) {
    try {
      if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new HttpException(
          'Authentication token is missing or invalid format',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      const token = authorization.split(' ')[1];
      
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'get_host_by_token' }, { token })
      );
      
      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Error retrieving host profile',
          response.statusCode
        );
      }
      
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve host profile',
        error.status || HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Get('/dashboard/:hostId')
  async getHostDashboard(
    @Param('hostId') hostId: string,
    @Headers('authorization') authorization: string
  ) {
    console.log(`[API Gateway] Request for dashboard with hostId: ${hostId}`);
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }
    
    try {
      console.log(`[API Gateway] Sending request to dashboard microservice for hostId: ${hostId}`);
      const response = await firstValueFrom(
        this.dashboardClient.send(
          { cmd: 'get_host_dashboard' },
          { hostId }
        )
      );
      
      console.log(`[API Gateway] Received response:`, response);
      
      if (!response || response.statusCode !== 200) {
        console.error(`[API Gateway] Error response:`, response);
        throw new HttpException(
          response?.error || 'Erreur lors de la récupération du dashboard',
          response?.statusCode || HttpStatus.NOT_FOUND
        );
      }
      
      return response.data;
    } catch (error) {
      console.error(`[API Gateway] Exception caught:`, error);
      throw new HttpException(
        error.message || 'Failed to get dashboard data',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch('profile/:hostId')
  async updateHostProfile(
    @Param('hostId') hostId: string,
    @Body() updateProfileDto: any,
    @Headers('authorization') authorization: string
  ) {
    console.log(`[API Gateway] Request to update profile for hostId: ${hostId}`);
    console.log(`[API Gateway] Update data received:`, updateProfileDto);
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Vérifier qu'on a bien les données minimales requises
    if (!updateProfileDto) {
      throw new HttpException(
        'Profile data is required',
        HttpStatus.BAD_REQUEST
      );
    }
    
    try {
      // Assurez-vous que firebaseuid est défini
      if (!updateProfileDto.firebaseuid) {
        updateProfileDto.firebaseuid = hostId;
      }
      
      const response = await firstValueFrom(
        this.settingsClient.send(
          { cmd: 'update_host_profile' },
          { hostId, updateProfileDto }
        )
      );
      
      console.log(`[API Gateway] Response from settings service:`, response);

      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Error updating host profile',
          response.statusCode
        );
      }

      return response.data;
    } catch (error) {
      console.error(`[API Gateway] Error updating profile:`, error);
      throw new HttpException(
        error.message || 'Failed to update host profile',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Get('validate-reset-token')
  async validateResetToken(@Query('token') token: string) {
    if (!token) {
      throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'validate_token' }, { token })
      );
      
      if (response.error) {
        throw new HttpException(response.error, HttpStatus.BAD_REQUEST);
      }
      
      return response;
    } catch (error) {
      console.error('Error validating token:', error);
      throw new HttpException(
        error.message || 'Invalid or expired token',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get(':firebaseUid')
  async getHostByFirebaseId(
    @Param('firebaseUid') firebaseUid: string,
    @Headers('authorization') authorization: string
  ) {
    try {
      // Validation du token d'authentification pour sécuriser l'endpoint
      if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new HttpException(
          'Authentication token is missing or invalid format',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'get-host-by-firebase-id' }, firebaseUid)
      );

      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Hôte introuvable',
          response.statusCode
        );
      }

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error retrieving host',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('plan')
  async createHostPlan(
    @Body() body: any,
    @Headers('authorization') authorization: string
  ) {
    console.log('Received in HTTP controller:', body);
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }
    
    try {
      // Ensure the message pattern matches what's expected in the microservice
      const response = await firstValueFrom(
        this.hostPlanClient.send('create_plan', body)
      );
      
      console.log('Response from microservice:', response);
      
      if (!response || response.error) {
        throw new HttpException(
          response?.error || 'Error creating the plan',
          response?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      return response;
    } catch (error) {
      console.error('Error communicating with microservice:', error);
      throw new HttpException(
        error.message || 'Error creating the plan', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id/plan')
  async getHostPlan(
    @Param('id') hostId: string,
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }
    
    try {
      // Format the payload as expected by the microservice
      const payload = { firebaseUid: hostId };
      
      const response = await firstValueFrom(
        this.hostPlanClient.send('get_plan_by_firebase_uid', payload)
      );
    
      if (!response) {
        throw new HttpException('No plan found for this user.', HttpStatus.NOT_FOUND);
      }
    
      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error retrieving plan:', error);
      throw new HttpException(
        error.message || 'Error retrieving plan', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  @Post(':id/activate-plan')
  async activatePlan(
    @Param('id') hostId: string,
    @Body() body: any,
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }
    
    try {
      // Prepare the payload with both hostId and plan information
      const payload = {
        hostId: hostId,
        plan: body.plan || 'Default Plan' // Fallback if plan is not provided
      };
      
      const response = await firstValueFrom(
        this.hostPlanClient.send('activate_plan', payload)
      );
      
      if (!response) {
        throw new HttpException('Failed to activate plan', HttpStatus.BAD_REQUEST);
      }
      
      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error activating plan:', error);
      throw new HttpException(
        error.message || 'Error activating plan', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('by-email/:email')
  async getHostByEmail(
    @Param('email') email: string,
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }
    
    try {
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'get_host_by_email' }, { email })
      );
      
      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Hôte introuvable',
          response.statusCode
        );
      }
      
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.message || 'Error retrieving host',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('forgot-password')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    try {
      const response = await firstValueFrom(
        this.hostClient.send(
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
      if (!data.testEmail) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }
      
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'test_email_delivery' }, { testEmail: data.testEmail })
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

  @Post('reset-password')
  async resetPassword(@Body() data: { token: string; newPassword: string }) {
    try {
      if (!data.token || !data.newPassword) {
        throw new HttpException('Token and new password are required', HttpStatus.BAD_REQUEST);
      }
      
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'reset_password' }, data)
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

  @Post('change-password')
  async changePassword(
    @Body() data: { userId: string; newPassword: string },
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }
    
    // Vérification des paramètres
    if (!data.userId || !data.newPassword) {
      throw new HttpException(
        '⚠️ Les champs userId et newPassword sont requis.',
        HttpStatus.BAD_REQUEST
      );
    }
  
    try {
      // Appel au microservice pour changer le mot de passe
      const result = await firstValueFrom(
        this.hostClient.send({ cmd: 'change_password' }, data)
      );
  
      // Vérifier si la réponse du microservice contient un message de succès
      if (result.statusCode === HttpStatus.OK) {
        return {
          statusCode: HttpStatus.OK,
          message: '✅ Mot de passe changé avec succès.',
        };
      } else {
        // Dans le cas d'un échec de la mise à jour du mot de passe
        throw new HttpException(
          result.message || '❌ Échec de la mise à jour du mot de passe.',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'appel au microservice:', error);
      throw new HttpException(
        error.message || '⛔ Une erreur est survenue lors du traitement de la demande.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('documents/update')
  @UseInterceptors(AnyFilesInterceptor())
  async updateHostDocuments(
    @Body() documentData: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Headers('authorization') authorization: string
  ) {
    console.log('[API Gateway] Received document update request');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }

    try {
      const token = authorization.split(' ')[1];

      const verifyResponse = await firstValueFrom(
        this.hostClient.send({ cmd: 'verify_token' }, { token })
      );

      if (verifyResponse.statusCode !== 200) {
        throw new HttpException(
          verifyResponse.error || 'Invalid token',
          verifyResponse.statusCode
        );
      }

      const userEmail = verifyResponse.data.email;

      const hostResponse = await firstValueFrom(
        this.hostClient.send({ cmd: 'get_host_by_email' }, { email: userEmail })
      );

      if (hostResponse.statusCode !== 200) {
        throw new HttpException(
          hostResponse.error || 'Host not found',
          hostResponse.statusCode
        );
      }

      const hostId = hostResponse.data._id;

      const processedFiles: Record<string, Express.Multer.File[]> = {};
      if (files && files.length > 0) {
        files.forEach(file => {
          const fieldName = file.fieldname;
          if (!processedFiles[fieldName]) {
            processedFiles[fieldName] = [];
          }
          processedFiles[fieldName].push(file);
        });
      }

      const response = await firstValueFrom(
        this.settingsClient.send(
          { cmd: 'update_host_documents' },
          {
            hostId,
            files: processedFiles,
            documentData
          }
        )
      );

      if (response.statusCode !== 200) {
        throw new HttpException(
          response.error || 'Error updating documents',
          response.statusCode
        );
      }

      return {
        statusCode: 200,
        message: 'Documents updated successfully',
        data: response.data
      };

    } catch (error) {
      console.error('[API Gateway] Error updating documents:', error);
      throw new HttpException(
        error.message || 'Failed to update documents',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':hostId/documents')
  async getHostDocuments(
    @Param('hostId') hostId: string,
    @Headers('authorization') authorization: string
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpException(
        'Authentication token is missing or invalid format',
        HttpStatus.UNAUTHORIZED
      );
    }
    
    try {
      const response = await firstValueFrom(
        this.hostClient.send('get_host_documents', hostId)
      );
      
      if (!response || response.error) {
        throw new HttpException(
          response?.error || 'Error retrieving host documents',
          response?.statusCode || HttpStatus.NOT_FOUND
        );
      }
      
      return response;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve host documents',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('file/:hostId/:fileName')
  async serveDocumentFile(
    @Param('hostId') hostId: string,
    @Param('fileName') fileName: string,
    @Headers('authorization') authorization: string,
    @Res() res: Response
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Authentication token is missing or invalid format'
      });
    }
    
    try {
      // Request file from microservice
      const fileResponse = await firstValueFrom(
        this.hostClient.send('get_document_file', { hostId, fileName })
      );

      if (fileResponse.exists) {
        // Set appropriate content type
        res.setHeader('Content-Type', fileResponse.contentType);
        
        // Send file as response
        return res.send(fileResponse.content);
      } else {
        return res.status(404).json({ message: 'Document not found' });
      }
    } catch (error) {
      console.error('Error serving document file:', error);
      return res.status(500).json({ message: 'Failed to retrieve document' });
    }
  }

  @Post('delete-host')
  async deleteUserAccount(
    @Body() data: { idToken: string, firebaseUid: string }
  ) {
    // Validate data
    if (!data.idToken) {
      throw new HttpException('Token missing', HttpStatus.BAD_REQUEST);
    }
    
    if (!data.firebaseUid) {
      throw new HttpException('Firebase UID missing', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const response = await firstValueFrom(
        this.hostClient.send({ cmd: 'delete_host' }, data)
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
}