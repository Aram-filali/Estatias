import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from './firebase'; 
import * as firebase from 'firebase/auth';

@Injectable()
export class FirebasePassService {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {
    // Constructeur vide - Firebase sera vérifié avant chaque utilisation
  }

  private async ensureFirebaseReady(): Promise<void> {
    if (!this.firebaseAdminService.isFirebaseAvailable) {
      // Attendre un peu au cas où l'initialisation serait en cours
      await this.firebaseAdminService.waitForInitialization(5000);
      
      if (!this.firebaseAdminService.isFirebaseAvailable) {
        throw new Error('Firebase service is not available');
      }
    }
  }

  async verifyToken(idToken: string): Promise<any> {
    try {
      await this.ensureFirebaseReady();
      return await this.firebaseAdminService.verifyIdToken(idToken);
    } catch (error: any) {
      console.error('Token verification error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async getUserByUid(uid: string): Promise<any> {
    try {
      await this.ensureFirebaseReady();
      return await this.firebaseAdminService.firebaseApp.auth().getUser(uid);
    } catch (error: any) {
      console.error('Get user error:', error);
      throw new NotFoundException('User not found');
    }
  }

  async verifyPassword(email: string, password: string): Promise<void> {
    try {
      // Cette méthode utilise Firebase client, pas admin
      const auth = firebase.getAuth();
      await firebase.signInWithEmailAndPassword(auth, email, password);
      await firebase.signOut(auth);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        throw new BadRequestException('Current password is incorrect');
      }
      throw new BadRequestException('Authentication failed: ' + error.message);
    }
  }

  async updateUserPassword(uid: string, newPassword: string): Promise<void> {
    try {
      await this.ensureFirebaseReady();
      await this.firebaseAdminService.firebaseApp.auth().updateUser(uid, {
        password: newPassword,
      });
    } catch (error: any) {
      console.error('Update password error:', error);
      throw new BadRequestException('Failed to update password: ' + error.message);
    }
  }
}