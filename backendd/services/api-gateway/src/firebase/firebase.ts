import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseAdminService {
  constructor(private configService: ConfigService) {
    try {
      // Vérifier si l'application Firebase Admin est déjà initialisée
      if (!admin.apps.length) {
        this.initializeFirebase();
        console.log('Firebase Admin SDK initialisé avec succès.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Firebase Admin SDK:', error);
      throw new Error('Erreur d\'initialisation Firebase Admin SDK');
    }
  }

  private initializeFirebase() {
    // SOLUTION 1: Variables d'environnement séparées (RECOMMANDÉE)
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    if (projectId && privateKey && clientEmail) {
      // Mode production avec variables d'environnement
      console.log('🔥 Initialisation Firebase avec variables d\'environnement');
      
      const serviceAccount = {
        type: "service_account",
        project_id: projectId,
        private_key: privateKey.replace(/\\n/g, '\n'), // Important: remplacer \\n par \n
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

    } else {
      // SOLUTION 2: JSON complet depuis variable d'environnement
      const firebaseServiceAccount = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
      
      if (firebaseServiceAccount) {
        console.log('🔥 Initialisation Firebase avec JSON depuis env');
        const serviceAccount = JSON.parse(firebaseServiceAccount);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: 'resa-4a1b6.appspot.com',
        });

      } else {
        // SOLUTION 3: Fallback pour développement local
        console.log('🔥 Initialisation Firebase avec fichier local (développement)');
        
        try {
          // Essayer plusieurs chemins possibles
          const possiblePaths = [
            path.resolve(__dirname, '../../../config/firebase-service-account.json'),
            path.resolve(__dirname, '../../config/firebase-service-account.json'),
            path.resolve(process.cwd(), 'config/firebase-service-account.json'),
            path.resolve(process.cwd(), 'firebase-service-account.json'), // Render place à la racine
          ];

          let serviceAccount = null;
          for (const filePath of possiblePaths) {
            try {
              serviceAccount = require(filePath);
              console.log(`✅ Firebase config trouvé à: ${filePath}`);
              break;
            } catch (err) {
              console.log(`❌ Firebase config non trouvé à: ${filePath}`);
            }
          }

          if (!serviceAccount) {
            throw new Error('Aucun fichier de configuration Firebase trouvé');
          }

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: 'resa-4a1b6.appspot.com',
          });

        } catch (fileError) {
          console.error('❌ Impossible de charger le fichier Firebase:', fileError);
          throw new Error('Configuration Firebase manquante');
        }
      }
    }
  }

  // Récupère l'instance de l'application Firebase Admin
  get firebaseApp(): admin.app.App {
    return admin.app();
  }

  // Vérification du token Firebase
  async verifyIdToken(token: string) {
    if (!token) {
      throw new Error('Token non fourni');
    }

    try {
      const decodedToken = await this.firebaseApp.auth().verifyIdToken(token);
      console.log('✅ Token Firebase vérifié:', decodedToken.uid);
      return decodedToken;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du token Firebase:', error);
      throw new Error('Token Firebase invalide ou expiré');
    }
  }

  // Méthode utilitaire pour tester la configuration
  async testFirebaseConnection(): Promise<boolean> {
    try {
      // Test simple: essayer de lister les utilisateurs (limité à 1)
      await this.firebaseApp.auth().listUsers(1);
      console.log('✅ Connexion Firebase Admin testée avec succès');
      return true;
    } catch (error) {
      console.error('❌ Échec du test de connexion Firebase:', error);
      return false;
    }
  }
}