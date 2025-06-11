// 3. Updated firebase-auth.guard.ts - Enhanced auth guard
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
      
      // Attach minimal user info to request
      request.user = {
        firebaseUid: decodedToken.uid,
        role: decodedToken.role,
        decodedToken // Keep full token for additional claims if needed
      };
      
      return true;
    } catch (error) {
      console.error('FirebaseAuthGuard error:', error);
      throw new UnauthorizedException('Invalid token or session expired');
    }
  }
}