// 2. Create role.guard.ts - Guard to check user roles
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseAdminService } from '../firebase/firebase';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are specified, allow access
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization token was found');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid authorization token format');
    }

    try {
      const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(token);
      
      // Get user role from custom claims
      const userRole = decodedToken.role;
      
      if (!userRole) {
        throw new ForbiddenException('User role not found in token');
      }

      // Check if user has required role
      const hasRole = requiredRoles.includes(userRole);
      
      if (!hasRole) {
        throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
      }

      // Attach minimal user info to request for later use
      request.user = {
        firebaseUid: decodedToken.uid,
        role: userRole,
        decodedToken // Keep full token for additional claims if needed
      };

      return true;
    } catch (error) {
      console.error('RoleGuard error:', error);
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token or session expired');
    }
  }
}