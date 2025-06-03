import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FirebaseAdminService } from './firebase';
import * as admin from 'firebase-admin';

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
      request.user = decodedToken;
      return true;
    } catch (error) {
      console.error('FirebaseAuthGuard error:', error);
      throw new UnauthorizedException('Invalid token or session expired');
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  }
}