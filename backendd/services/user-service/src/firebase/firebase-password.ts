import { Injectable, BadRequestException, UnauthorizedException,NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as firebase from 'firebase/auth';

@Injectable()
export class FirebasePassService {
  private adminAuth: admin.auth.Auth;

  constructor() {
    this.adminAuth = admin.auth();
  }

  async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.adminAuth.verifyIdToken(idToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      return await this.adminAuth.getUser(uid);
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  async verifyPassword(email: string, password: string): Promise<void> {
    try {
      // Use Firebase Auth REST API to verify password
      const auth = firebase.getAuth();
      await firebase.signInWithEmailAndPassword(auth, email, password);
      // Sign out immediately after verification
      await firebase.signOut(auth);
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        throw new BadRequestException('Current password is incorrect');
      }
      throw new BadRequestException('Authentication failed: ' + error.message);
    }
  }

  async updateUserPassword(uid: string, newPassword: string): Promise<void> {
    try {
      await this.adminAuth.updateUser(uid, {
        password: newPassword,
      });
    } catch (error) {
      throw new BadRequestException('Failed to update password: ' + error.message);
    }
  }
}