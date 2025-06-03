import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseAdminService {
  constructor() {
    try {
      // Vérifier si l'application Firebase Admin est déjà initialisée
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(
            require(path.resolve(__dirname, '../../../config/firebase-service-account.json'))
          ),
        });
        console.log('Firebase Admin SDK initialisé avec succès.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Firebase Admin SDK:', error);
      throw new Error('Erreur d\'initialisation Firebase Admin SDK');
    }
  }

  get firebaseApp(): admin.app.App {
    return admin.app();
  }

  async verifyIdToken(token: string) {
    if (!token) {
      throw new Error('Token non fourni');
    }

    try {
      const decodedToken = await this.firebaseApp.auth().verifyIdToken(token); 
      console.log('Token vérifié:', decodedToken);
      return decodedToken;
    } catch (error) {
      console.error('Erreur lors de la vérification du token Firebase:', error);
      throw new Error('Token Firebase invalide ou expiré');
    }
  }
}
