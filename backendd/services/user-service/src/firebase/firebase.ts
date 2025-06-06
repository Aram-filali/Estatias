import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseAdminService {
  private isInitialized = false;
  private initializationError: string | null = null;

  constructor(private configService: ConfigService) {
    // Différer l'initialisation pour éviter les erreurs au démarrage
    this.initializeFirebaseAsync();
  }

  private async initializeFirebaseAsync() {
    try {
      // Vérifier si l'application Firebase Admin est déjà initialisée
      if (!admin.apps.length) {
        await this.initializeFirebase();
        this.isInitialized = true;
        console.log('✅ Firebase Admin SDK initialisé avec succès.');
      } else {
        this.isInitialized = true;
        console.log('✅ Firebase Admin SDK déjà initialisé.');
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'initialisation de Firebase Admin SDK:', error);
      this.initializationError = error.message;
      
      // NE PAS THROW l'erreur - laisser l'application démarrer
      console.warn('⚠️ L\'application continuera sans Firebase. Certaines fonctionnalités peuvent être limitées.');
    }
  }

  private async initializeFirebase() {
    // SOLUTION 1: Variables d'environnement séparées (RECOMMANDÉE)
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    console.log('🔍 Debug Firebase Config:');
    console.log('Project ID présent:', !!projectId);
    console.log('Private Key présent:', !!privateKey && privateKey.length > 50);
    console.log('Client Email présent:', !!clientEmail);

    if (projectId && privateKey && clientEmail) {
      // Mode production avec variables d'environnement
      console.log('🔥 Initialisation Firebase avec variables d\'environnement');
      
      // Nettoyage de la clé privée
      const cleanPrivateKey = privateKey
        .replace(/\\n/g, '\n')
        .replace(/"/g, '')
        .trim();

      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key: cleanPrivateKey,
        client_email: clientEmail,
        client_id: this.configService.get<string>('FIREBASE_CLIENT_ID'),
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${clientEmail}`
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        storageBucket: 'resa-4a1b6.appspot.com',
      });

      return; // Sortir de la fonction si succès
    }

    // SOLUTION 2: JSON complet depuis variable d'environnement
    const firebaseServiceAccount = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
    
    if (firebaseServiceAccount) {
      console.log('🔥 Initialisation Firebase avec JSON depuis env');
      
      try {
        const serviceAccount = JSON.parse(firebaseServiceAccount);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: 'resa-4a1b6.appspot.com',
        });

        return; // Sortir de la fonction si succès
      } catch (parseError: any) {
        console.error('❌ Erreur lors du parsing du JSON Firebase:', parseError);
        throw new Error('Format JSON Firebase invalide');
      }
    }

    // SOLUTION 3: Fallback pour développement local
    console.log('🔥 Tentative d\'initialisation Firebase avec fichier local (développement)');
    
    const possiblePaths = [
      path.resolve(__dirname, '../../../config/firebase-service-account.json'),
      path.resolve(__dirname, '../../config/firebase-service-account.json'),
      path.resolve(process.cwd(), 'config/firebase-service-account.json'),
      path.resolve(process.cwd(), 'firebase-service-account.json'),
      path.resolve(__dirname, '../config/firebase-service-account.json'),
      path.resolve(__dirname, './config/firebase-service-account.json'),
    ];

    let serviceAccount = null;

    for (const filePath of possiblePaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          serviceAccount = require(filePath);
          console.log(`✅ Firebase config trouvé à: ${filePath}`);
          break;
        }
      } catch (err: any) {
        console.log(`❌ Erreur lors de la lecture de: ${filePath}`, err.message);
      }
    }

    if (!serviceAccount) {
      const availableEnvVars = {
        FIREBASE_PROJECT_ID: !!this.configService.get('FIREBASE_PROJECT_ID'),
        FIREBASE_PRIVATE_KEY: !!this.configService.get('FIREBASE_PRIVATE_KEY'),
        FIREBASE_CLIENT_EMAIL: !!this.configService.get('FIREBASE_CLIENT_EMAIL'),
        FIREBASE_SERVICE_ACCOUNT: !!this.configService.get('FIREBASE_SERVICE_ACCOUNT'),
      };
      
      console.error('❌ Variables d\'environnement disponibles:', availableEnvVars);
      console.error('❌ Valeurs actuelles:');
      console.error('PROJECT_ID:', this.configService.get('FIREBASE_PROJECT_ID'));
      console.error('CLIENT_EMAIL:', this.configService.get('FIREBASE_CLIENT_EMAIL'));
      console.error('PRIVATE_KEY length:', this.configService.get('FIREBASE_PRIVATE_KEY')?.length || 0);
      
      throw new Error('Aucun fichier de configuration Firebase trouvé et aucune variable d\'environnement configurée correctement');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'resa-4a1b6.appspot.com',
    });
  }

  // Récupère l'instance de l'application Firebase Admin
  get firebaseApp(): admin.app.App {
    if (!this.isInitialized) {
      throw new Error(`Firebase non initialisé: ${this.initializationError}`);
    }
    return admin.app();
  }

  // Vérifier si Firebase est disponible
  get isFirebaseAvailable(): boolean {
    return this.isInitialized && !this.initializationError;
  }

  // Vérification du token Firebase
  async verifyIdToken(token: string) {
    if (!this.isFirebaseAvailable) {
      throw new Error('Firebase non disponible - impossible de vérifier le token');
    }

    if (!token) {
      throw new Error('Token non fourni');
    }

    try {
      const decodedToken = await this.firebaseApp.auth().verifyIdToken(token);
      console.log('✅ Token Firebase vérifié:', decodedToken.uid);
      return decodedToken;
    } catch (error: any) {
      console.error('❌ Erreur lors de la vérification du token Firebase:', error);
      throw new Error('Token Firebase invalide ou expiré');
    }
  }

  // Méthode utilitaire pour tester la configuration
  async testFirebaseConnection(): Promise<boolean> {
    if (!this.isFirebaseAvailable) {
      console.warn('⚠️ Firebase non disponible pour le test de connexion');
      return false;
    }

    try {
      // Test simple: essayer de lister les utilisateurs (limité à 1)
      await this.firebaseApp.auth().listUsers(1);
      console.log('✅ Connexion Firebase Admin testée avec succès');
      return true;
    } catch (error: any) {
      console.error('❌ Échec du test de connexion Firebase:', error);
      return false;
    }
  }

  // Méthode pour obtenir le statut de Firebase
  getFirebaseStatus() {
    return {
      isAvailable: this.isFirebaseAvailable,
      isInitialized: this.isInitialized,
      error: this.initializationError
    };
  }

  // Attendre que l'initialisation soit terminée
  async waitForInitialization(timeout = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (!this.isInitialized && !this.initializationError && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.isInitialized;
  }
}