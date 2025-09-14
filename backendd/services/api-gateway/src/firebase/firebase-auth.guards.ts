// firebase-auth.guard.ts - Fixed version
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FirebaseAdminService } from './firebase';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization token was found');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization token format');
    }

    return this.validateToken(token, request);
  }

  private async validateToken(token: string, request: any): Promise<boolean> {
    try {
      const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(token);
      
      console.log('Decoded Firebase token:', decodedToken); // Debug log
      
      // Extract all necessary user info from Firebase token
      request.user = {
        firebaseUid: decodedToken.uid,
        email: decodedToken.email, // 🔥 THIS WAS MISSING!
        name: decodedToken.name,
        role: decodedToken.role || 'user', // Default role if not set
        emailVerified: decodedToken.email_verified,
        decodedToken // Keep full token for additional claims if needed
      };

      console.log('Request user set to:', request.user); // Debug log
      
      return true;
    } catch (error) {
      console.error('FirebaseAuthGuard error:', error);
      throw new UnauthorizedException('Invalid token or session expired');
    }
  }
}