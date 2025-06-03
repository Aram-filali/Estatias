import { 
  Injectable, 
  forwardRef, 
  Inject, 
  NotFoundException, 
  UnauthorizedException, 
  InternalServerErrorException, 
  BadRequestException 
} from '@nestjs/common';
import { FirebaseAdminService } from './firebase/firebase';
import { FirebasePassService } from './firebase/firebase-password';
import * as bcrypt from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schema/user.schema';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as validator from 'validator';
import axios from 'axios';
import { EmailService } from './forgetPassword/email.service';

@Injectable()
export class UserService {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly firebasePassword: FirebasePassService,
    @Inject(forwardRef(() => EmailService)) private readonly emailService: EmailService,
    @InjectModel(User.name) private userModel: Model<User>
  ) {}
  

  async signupUser(fullname: string, email: string, password: string) {  
    const userExists = await this.findOneByEmail(email);
    if (userExists) {
      throw new Error('User already exists in DB');
    }
  
    let firebaseUser;
  
    try {
      firebaseUser = await this.firebaseAdminService.firebaseApp.auth().createUser({
        displayName: fullname,
        email,
        password,
        emailVerified: false // Désactive le compte jusqu'à vérification
      });
  
      // Envoi de l'email de vérification
      const emailVerificationLink = await this.firebaseAdminService.firebaseApp
        .auth()
        .generateEmailVerificationLink(email);
  
      // Envoyer le lien via votre service SMTP
      await this.emailService.sendVerificationEmail(email, firebaseUser.uid);
  
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new Error('Email is already in use by another account (Firebase)');
      } else {
        throw new Error(`Firebase error: ${error.message}`);
      }
    }
  
    // Force le rôle à 'user'
    const role = 'user';
    await this.firebaseAdminService.firebaseApp.auth().setCustomUserClaims(firebaseUser.uid, { 
      role,
      emailVerified: false // Ajoute cette info dans les claims
    });
  
    const newUser = await this.createUser({
      fullname,
      email,
      firebaseUid: firebaseUser.uid,
      role,
      emailVerified: false // Stocke l'état de vérification dans MongoDB
    });
  
    console.log('User created with default "user" role: ', newUser);
    return newUser;
  }
  
  async createUser(userData: CreateUserDto): Promise<User> {
    const user = new this.userModel(userData);
    return await user.save();
  }
    
  async findOneByEmail(email: string): Promise<User | null> {
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }
    return this.userModel.findOne({ email }).exec();
  }

  async findOneByFirebaseUid(firebaseUid: string): Promise<User | null> {
    if (!firebaseUid) {
      throw new Error('Firebase UID is required');
    }
    return this.userModel.findOne({ firebaseUid }).exec();
  }

  async loginUser(idToken: string, email?: string, password?: string) {
    // Vérifie si l'idToken est fourni
    if (!idToken) {
      throw new HttpException('ID token is required', HttpStatus.BAD_REQUEST);
    }
  
    try {
      const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(idToken);
  
      // Vérifier si l'email du decodedToken est défini
      if (!decodedToken.email) {
        throw new HttpException('Email not found in decoded token', HttpStatus.BAD_REQUEST);
      }
  
      const firebaseUser = await this.findOneByEmail(decodedToken.email);
  
      if (!firebaseUser) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
  
      // Vérification que l'email est bien vérifié
      if (!firebaseUser.emailVerified) {
        throw new HttpException(
          'Email not verified. Please verify your email before logging in.',
          HttpStatus.UNAUTHORIZED
        );
      }
  
      return {
        ...decodedToken,
        role: firebaseUser.role,
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new HttpException(
        error.message || 'Failed to authenticate token', 
        HttpStatus.UNAUTHORIZED
      );
    }
  }
  
  async signupGoogleUser(idToken: string, role: string = 'user') {
    if (!idToken) {
      throw new HttpException("Token manquant", HttpStatus.BAD_REQUEST);
    }
  
    try {
      const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(idToken);
      const email = decodedToken.email;
      const fullname = decodedToken.name || "Utilisateur Google";
  
      if (!email) {
        throw new HttpException("Email non fourni par Google", HttpStatus.BAD_REQUEST);
      }
  
      // 🔍 Étape 1 : Vérification MongoDB
      const mongoUser = await this.userModel.findOne({ email }).exec();
      if (mongoUser) {
        throw new HttpException("Un compte avec cet email existe déjà", HttpStatus.CONFLICT);
      }
  
      // 🔍 Étape 2 : Vérification Firebase
      let firebaseUser;
      try {
        firebaseUser = await this.firebaseAdminService.firebaseApp.auth().getUserByEmail(email);
        //S'il existe déjà → on continue sans erreur (créé côté frontend probablement)
      } catch (firebaseError) {
        if (firebaseError.code === 'auth/user-not-found') {
          //Pas trouvé : on le crée côté backend
          firebaseUser = await this.firebaseAdminService.firebaseApp.auth().createUser({
            email,
            displayName: fullname,
          });
        } else {
          throw new HttpException(firebaseError.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
  
      //Ajout rôle personnalisé (même si user déjà existait)
      await this.firebaseAdminService.firebaseApp.auth().setCustomUserClaims(firebaseUser.uid, { role });
  
      //Création MongoDB
      const newUser = await this.createUser({
        fullname,
        email,
        firebaseUid: firebaseUser.uid,
        role,
        emailVerified: true
      });
  
      return {
        message: "Utilisateur inscrit avec succès via Google",
        user: newUser,
      };
  
    } catch (error) {
      console.error("Erreur lors de l'inscription Google :", error);
      throw new HttpException(
        error.message || "Erreur lors de l'inscription avec Google",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  async loginGoogleUser(idToken: string) {
    if (!idToken) {
      throw new HttpException("Token manquant", HttpStatus.BAD_REQUEST);
    }
  
    try {
      const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(idToken);
      const email = decodedToken.email ?? '';
      
      const existingUser = await this.userModel.findOne({ email }).exec();
      if (!existingUser) {
        throw new HttpException("L'email n'est pas trouvé dans la base de données.", HttpStatus.UNAUTHORIZED);
      }
  
      const userRecord = await this.firebaseAdminService.firebaseApp.auth().getUserByEmail(email);
  
      // 🔥 Récupérer le custom claim (role)
      const claims = decodedToken;
      const role = claims.role || 'user'; // fallback si pas défini
  
      return {
        message: "Authentification réussie via Google",
        user: existingUser, // On retourne l'utilisateur de la BDD (plus complet)
        role: role,
      };
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw new HttpException("L'email n'est pas authentifié sur Firebase.", HttpStatus.UNAUTHORIZED);
      }
      throw new HttpException(
        error.message || "Échec de l'authentification avec le token",
        error.status || HttpStatus.UNAUTHORIZED
      );
    }
  }

  async updatePasswordInFirebase(email: string, newPassword: string) {
    try {
      const userRecord = await this.firebaseAdminService.firebaseApp.auth().getUserByEmail(email);
      console.log('User found in Firebase:', userRecord);
  
      if (!userRecord) {
        console.error('User not found in Firebase for the email:', email);
        return null;
      }
  
      await this.firebaseAdminService.firebaseApp.auth().updateUser(userRecord.uid, {
        password: newPassword,
      });
  
      console.log('Password updated in Firebase for the user:', userRecord);
      return userRecord;
    } catch (error) {
      console.error("Error during password update in Firebase:", error);
      return null;
    }
  }

  async updateUser(updateUserDto: UpdateUserDto): Promise<User> {
    const {
      firebaseUid,
      fullname,
      newPassword,
      currentPassword,
      emailVerified // 👈 ajouté pour les mises à jour de vérification d'email
    } = updateUserDto;
  
    if (!firebaseUid) {
      throw new BadRequestException('Firebase UID is required');
    }
  
    const user = await this.userModel.findOne({ firebaseUid });
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    let updated = false;
  
    // Met à jour le fullname si modifié
    if (fullname && fullname !== user.fullname) {
      user.fullname = fullname;
      updated = true;
    }
  
    // Met à jour le champ emailVerified s'il est précisé
    if (typeof emailVerified === 'boolean' && emailVerified !== user.emailVerified) {
      user.emailVerified = emailVerified;
      updated = true;
    }
  
    // Gestion de la mise à jour du mot de passe
    if (newPassword) {
      try {
        const firebaseUser = await this.firebaseAdminService.firebaseApp.auth().getUser(firebaseUid);
  
        const isEmailPasswordUser = firebaseUser.providerData.some(
          (provider) => provider.providerId === 'password'
        );
  
        if (isEmailPasswordUser) {
          if (!currentPassword) {
            throw new BadRequestException('Current password is required');
          }
  
          if (!firebaseUser.email) {
            throw new BadRequestException('Email is required for password verification');
          }
  
          await this.verifyCurrentPassword(firebaseUser.email, currentPassword);
        }
  
        if (newPassword.length < 6) {
          throw new BadRequestException('Password must be at least 6 characters');
        }
  
        await this.firebaseAdminService.firebaseApp.auth().updateUser(firebaseUid, {
          password: newPassword,
        });
  
        updated = true;
      } catch (error) {
        console.error('Password update error:', error);
  
        if (error.code === 'auth/invalid-password') {
          throw new BadRequestException('Password does not meet requirements: ' + error.message);
        }
        if (error.message.includes('INVALID_LOGIN_CREDENTIALS')) {
          throw new BadRequestException('Current password is incorrect');
        }
        if (error.code === 'auth/requires-recent-login') {
          throw new BadRequestException('Please reauthenticate before changing password');
        }
  
        throw new InternalServerErrorException(`Password update failed: ${error.message}`);
      }
    }
  
    if (!updated) {
      throw new BadRequestException('No changes requested');
    }
  
    try {
      const savedUser = await user.save();
      return savedUser;
    } catch (error) {
      console.error('Error saving user:', error);
      throw new InternalServerErrorException('Failed to save user changes');
    }
  }
  

private async verifyCurrentPassword(email: string, password: string): Promise<void> {
  if (!email) {
      throw new Error('EMAIL_REQUIRED');
  }

  const FIREBASE_API_KEY = process.env.FIREBASE_WEB_API_KEY;
  if (!FIREBASE_API_KEY) {
      throw new Error('FIREBASE_API_KEY_NOT_CONFIGURED');
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

  try {
      const response = await axios.post(url, {
          email,
          password,
          returnSecureToken: true
      }, {
          timeout: 10000 // 10 second timeout
      });

      if (response.data.error) {
          throw new Error(response.data.error.message);
      }
  } catch (error) {
      console.error('Password verification error:', error);
      
      if (error.response?.data?.error) {
          const firebaseError = error.response.data.error;
          
          // Map Firebase errors to user-friendly messages
          switch (firebaseError.message) {
              case 'INVALID_PASSWORD':
              case 'INVALID_EMAIL':
              case 'EMAIL_NOT_FOUND':
                  throw new Error('INVALID_LOGIN_CREDENTIALS');
              case 'TOO_MANY_ATTEMPTS_TRY_LATER':
                  throw new Error('Account temporarily locked due to many failed attempts');
              case 'USER_DISABLED':
                  throw new Error('Account has been disabled');
              default:
                  throw new Error(firebaseError.message);
          }
      } else if (error.code === 'ECONNABORTED') {
          throw new Error('Connection timeout during password verification');
      }
      
      throw error;
  }
}

async deleteUser(idToken: string, firebaseUid: string): Promise<{ success: boolean; message: string }> {
  try {
      // Vérifier le token et récupérer l'utilisateur
      const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(idToken);
      
      // Trouver l'utilisateur dans MongoDB
      const user = await this.userModel.findOne({ firebaseUid }).exec();
      if (!user) {
          throw new NotFoundException('User not found in database');
      }

      // Vérifier que l'UID Firebase correspond
      if (decodedToken.uid !== firebaseUid) {
          throw new UnauthorizedException('Unauthorized to delete this account');
      }

      // Supprimer de Firebase
      try {
          await this.firebaseAdminService.firebaseApp.auth().deleteUser(firebaseUid);
      } catch (firebaseError) {
          // Continuer si l'utilisateur n'existe pas déjà dans Firebase
          if (firebaseError.code !== 'auth/user-not-found') {
              throw firebaseError;
          }
      }

      // Supprimer de MongoDB
      await this.userModel.deleteOne({ firebaseUid }).exec();

      return {
          success: true,
          message: 'Account deleted successfully'
      };
  } catch (error) {
      console.error('Account deletion error:', error);
      throw new InternalServerErrorException(
          error.message || 'Failed to delete account'
      );
  }
}

  async changePassword(firebaseUid: string, newPassword: string, currentPassword?: string): Promise<{ success: boolean, message: string }> {
    try {
      // Check if user exists
      const userRecord = await this.firebaseAdminService.firebaseApp.auth().getUser(firebaseUid);
      if (!userRecord) {
        return {
          success: false,
          message: 'User not found'
        };
      }
  
      // Update the password in Firebase
      await this.firebaseAdminService.firebaseApp.auth().updateUser(firebaseUid, {
        password: newPassword
      });
      
      console.log('Password updated in Firebase for user:', firebaseUid);
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      console.error('Error updating password in Firebase:', error);
      return {
        success: false,
        message: error.message || 'Error updating password'
      };
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      // Check if token is provided
      if (!token) {
        throw new Error('No token provided');
      }
    
      // Ensure token is a string and not undefined/null
      if (typeof token !== 'string') {
        throw new Error('Token must be a string');
      }
    
      // Verify the token with Firebase
      const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(token);
      
      if (!decodedToken) {
        throw new Error('Invalid token');
      }
      
      // Return the decoded token data with proper structure
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'user',
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      
      if (error.code === 'auth/id-token-expired') {
        throw new Error('Authentication token has expired. Please login again.');
      }
      
      if (error.code === 'auth/id-token-revoked' || error.code === 'auth/invalid-id-token') {
        throw new Error('Invalid authentication token. Please login again.');
      }
      
      throw new Error(`Authentication error: ${error.message}`);
    }
  }
/*
  * @param idToken Firebase ID token
  */
 async getProfile(idToken: string) {
   if (!idToken) {
     throw new BadRequestException('ID token is required');
   }
 
   try {
     const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(idToken);
     
     if (!decodedToken.email) {
       throw new BadRequestException('Email not found in token');
     }
 
     const user = await this.findOneByEmail(decodedToken.email);
     
     if (!user) {
       throw new NotFoundException('User not found');
     }
 
     // Return user profile data without sensitive information
     return {
       success: true,
       user: {
         firebaseUid: user.firebaseUid,
         fullname: user.fullname,
         email: user.email,
         role: user.role,
         //createdAt: user.createdAt
       }
     };
   } catch (error) {
     console.error('Error getting profile:', error);
     
     if (error instanceof BadRequestException || error instanceof NotFoundException) {
       throw error;
     }
     
     throw new InternalServerErrorException(
       error.message || 'Failed to get profile'
     );
   }
 }
}