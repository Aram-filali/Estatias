import { Injectable } from '@nestjs/common';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

@Injectable()
export class FirebaseClientService {
  public auth;

  constructor() {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    };

    const app = initializeApp(firebaseConfig);
    this.auth = getAuth(app);
  }

  async signInWithEmailPassword(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      return idToken;
    } catch (error) {
      console.error('Erreur de connexion:', error.message);
      throw new Error('Invalid credentials');
    }
  }

  async testSignIn() {
    const email = 'azou@gmail.com'; 
    const password = 'azouazou';  

    try {
      const idToken = await this.signInWithEmailPassword(email, password);
      console.log('Connexion réussie avec le token:', idToken);
    } catch (error) {
      console.error('Erreur de connexion:', error.message);
    }
  }
}
