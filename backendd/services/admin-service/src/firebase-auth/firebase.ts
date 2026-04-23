import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

type RawServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
};

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

      const serviceAccount = this.loadServiceAccount();
      
      // Vérifications de base du fichier de service account
      if (!serviceAccount.privateKey || !serviceAccount.clientEmail || !serviceAccount.projectId) {
        throw new Error('Fichier de clé de service invalide - propriétés manquantes');
      }

      // Initialiser Firebase Admin
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'resa-4a1b6.appspot.com',
      });

      console.log('Firebase Admin SDK initialisé avec succès.');
      console.log(`Projet ID: ${serviceAccount.projectId}`);
      console.log(`Client Email: ${serviceAccount.clientEmail}`);
      
    } catch (error: any) {
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

  private parseServiceAccount(raw: string): admin.ServiceAccount {
    const parsed = JSON.parse(raw) as RawServiceAccount;
    const privateKeyRaw = parsed.privateKey || parsed.private_key;

    return {
      projectId: parsed.projectId || parsed.project_id,
      clientEmail: parsed.clientEmail || parsed.client_email,
      privateKey: privateKeyRaw ? this.normalizePrivateKey(privateKeyRaw) : undefined,
    };
  }

  private normalizePrivateKey(privateKey: string): string {
    let normalized = privateKey.trim();

    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1);
    }

    normalized = normalized
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n');

    return normalized;
  }

  private loadServiceAccount(): admin.ServiceAccount {
    const envJson =
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_SERVICE_ACCOUNT;

    if (envJson) {
      return this.parseServiceAccount(envJson);
    }

    const localConfigPath = path.resolve(process.cwd(), 'config', 'firebase-service-account.json');
    if (fs.existsSync(localConfigPath)) {
      return this.parseServiceAccount(fs.readFileSync(localConfigPath, 'utf-8'));
    }

    const sharedConfigPath = path.resolve(process.cwd(), '..', 'config', 'firebase-service-account.json');
    if (fs.existsSync(sharedConfigPath)) {
      return this.parseServiceAccount(fs.readFileSync(sharedConfigPath, 'utf-8'));
    }

    throw new Error(
      `Fichier de clé de service introuvable: ${localConfigPath}`,
    );
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