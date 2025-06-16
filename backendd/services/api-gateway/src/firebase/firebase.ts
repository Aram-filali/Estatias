import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirebaseAdminService {
  constructor() {
    this.initializeFirebaseAdmin();
  }

  private initializeFirebaseAdmin() {
    try {
      // Vérifier si l'application Firebase Admin est déjà initialisée
      if (admin.apps.length > 0) {
        console.log('Firebase Admin SDK déjà initialisé.');
        return;
      }

      // Chemin vers le fichier de service account
      const serviceAccountPath = path.resolve(__dirname, '../../../config/firebase-service-account.json');
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Fichier de clé de service introuvable: ${serviceAccountPath}`);
      }

      // Lire et valider le fichier JSON
      const serviceAccount = require(serviceAccountPath);
      
      // Vérifications de base du fichier de service account
      if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
        throw new Error('Fichier de clé de service invalide - propriétés manquantes');
      }

      // Initialiser Firebase Admin
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'resa-4a1b6.appspot.com',
      });

      console.log('Firebase Admin SDK initialisé avec succès.');
      console.log(`Projet ID: ${serviceAccount.project_id}`);
      console.log(`Client Email: ${serviceAccount.client_email}`);
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Firebase Admin SDK:', error);
      
      // Messages d'erreur spécifiques
      if (error.message.includes('invalid_grant')) {
        console.error('🔑 La clé de service Firebase est invalide ou expirée.');
        console.error('📝 Actions à effectuer :');
        console.error('   1. Générer une nouvelle clé dans Firebase Console');
        console.error('   2. Remplacer le fichier firebase-service-account.json');
        console.error('   3. Vérifier la synchronisation de l\'horloge du serveur');
      }
      
      throw new Error(`Erreur d'initialisation Firebase Admin SDK: ${error.message}`);
    }
  }

  // Récupère l'instance de l'application Firebase Admin
  get firebaseApp(): admin.app.App {
    if (admin.apps.length === 0) {
      throw new Error('Firebase Admin SDK non initialisé');
    }
    return admin.app();
  }

  // Vérification du token Firebase avec retry
  async verifyIdToken(token: string, retries: number = 1) {
    if (!token) {
      throw new Error('Token non fourni');
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const decodedToken = await this.firebaseApp.auth().verifyIdToken(token);
        console.log('Token vérifié avec succès:', {
          uid: decodedToken.uid,
          email: decodedToken.email,
          exp: new Date(decodedToken.exp * 1000).toISOString()
        });
        return decodedToken;
        
      } catch (error) {
        console.error(`Tentative ${attempt + 1}/${retries + 1} - Erreur vérification token:`, error.message);
        
        if (attempt === retries) {
          // Dernière tentative échouée
          if (error.code === 'auth/id-token-expired') {
            throw new Error('Token Firebase expiré');
          } else if (error.code === 'auth/id-token-revoked') {
            throw new Error('Token Firebase révoqué');
          } else if (error.code === 'auth/invalid-id-token') {
            throw new Error('Token Firebase invalide');
          } else {
            throw new Error(`Erreur de vérification du token: ${error.message}`);
          }
        }
        
        // Attendre avant la prochaine tentative
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  // Méthode utilitaire pour tester la connexion
  async testConnection(): Promise<boolean> {
    try {
      const auth = this.firebaseApp.auth();
      // Tenter de lister les utilisateurs (limité à 1) pour tester la connexion
      await auth.listUsers(1);
      console.log('✅ Connexion Firebase Admin testée avec succès');
      return true;
    } catch (error) {
      console.error('❌ Échec du test de connexion Firebase Admin:', error.message);
      return false;
    }
  }
}