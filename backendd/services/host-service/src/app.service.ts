import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException, InternalServerErrorException, Inject,  forwardRef } from '@nestjs/common'; 
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateHostDto } from './dto/create-host.dto';
import { Host, HostDocument } from './schema/host.schema';
import axios from 'axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FirebaseAdminService } from './firebase/firebase';
import * as validator from 'validator';
import { EmailService } from './forgetPassword/email.service';

@Injectable()
export class HostService {
    constructor(
        @InjectModel(Host.name) private readonly hostModel: Model<HostDocument>,
        private readonly firebaseAdminService: FirebaseAdminService,
        @Inject(forwardRef(() => EmailService)) private readonly emailService: EmailService,    ) {}

    async createHost(createHostDto: CreateHostDto): Promise<Host> {
      const { email, password, firebaseUid } = createHostDto;
      
      if (!email || !password) {
        throw new BadRequestException('Les champs email et password sont obligatoires.');
      }
      
      const existingHost = await this.hostModel.findOne({ email }).exec();
      if (existingHost) {
        throw new ConflictException('Cet email est déjà utilisé dans MongoDB.');
      }
      
      let firebaseUser;
      
      try {
        // Check if a Firebase user already exists with the provided UID
        if (firebaseUid) {
          try {
            firebaseUser = await this.firebaseAdminService.firebaseApp.auth().getUser(firebaseUid);
            console.log("Firebase user found with provided UID:", firebaseUser.uid);
          } catch (error) {
            if (error.code === 'auth/user-not-found') {
              console.warn("Firebase UID provided but user not found. Creating a new Firebase user...");
              firebaseUser = await this.firebaseAdminService.firebaseApp.auth().createUser({
                email,
                password,
                uid: firebaseUid
              });
            } else {
              throw error;
            }
          }
        } else {
          // If no Firebase UID is provided, check by email
          try {
            firebaseUser = await this.firebaseAdminService.firebaseApp.auth().getUserByEmail(email);
            console.warn("User already exists in Firebase. Using this user...");
          } catch (error) {
            if (error.code === 'auth/user-not-found') {
              firebaseUser = await this.firebaseAdminService.firebaseApp.auth().createUser({
                email,
                password,
              });
            } else {
              throw error;
            }
          }
        }
        
        const role = 'host';
        const status = 'pending';
        
        // Set custom claims for the user role
        await this.firebaseAdminService.firebaseApp.auth().setCustomUserClaims(firebaseUser.uid, { role });
        
        // Use the data as-is without re-uploading files
        // Frontend already provides URLs from its Firebase storage uploads
        const hostData = { ...createHostDto };
        
        // Ensure Firebase UID is set correctly
        hostData.firebaseUid = firebaseUser.uid;
        
        // Create MongoDB record with emailVerified set to false initially
        const newHost = new this.hostModel({
          role,
          status,
          emailVerified: false, // Set email verification status to false by default
          ...hostData,
        });
        
        const savedHost = await newHost.save();
        console.log("Host saved in MongoDB:", savedHost);

              // Envoi de l'email de vérification
          const emailVerificationLink = await this.firebaseAdminService.firebaseApp
          .auth()
          .generateEmailVerificationLink(email);


        // Send verification email after successful registration
        try {
            // Envoyer le lien via votre service SMTP
            await this.emailService.sendVerificationEmail(email, firebaseUser.uid);
          console.log(`Verification email sent to ${email}`);
        } catch (emailError) {
          console.error(`Failed to send verification email to ${email}:`, emailError);
          // Don't throw error here, as user creation was successful
        }
        
        return savedHost;
        
      } catch (error) {
        console.error("Error creating user:", error);
        throw new InternalServerErrorException(`Error creating account: ${error.message}`);
      }
    }
  
      
    async loginHost(idToken: string = '', email: string = '', password: string = '') {
        if (idToken) {
          try {
            const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(idToken);
            
            // Check if email is verified in MongoDB
            const host = await this.hostModel.findOne({ email: decodedToken.email }).exec();
            if (!host) {
              throw new HttpException("Utilisateur non trouvé dans la base de données", HttpStatus.NOT_FOUND);
            }
            
            if (!host.emailVerified) {
              throw new HttpException("Veuillez vérifier votre email avant de vous connecter", HttpStatus.FORBIDDEN);
            }
      
            //Récupérer le custom claim (role)
            const role = decodedToken.role || 'host';
      
            return {
              message: "Authentification réussie via Firebase",
              user: decodedToken,
              role: role,
            };
          } catch (error) {
            throw new HttpException(error.message || "Échec de l'authentification avec le token", HttpStatus.UNAUTHORIZED);
          }
        }
      
        if (email === 'admin1@gmail.com' || email === 'admin2@gmail.com') {
          throw new HttpException("L'email est réservé et ne peut pas être utilisé", HttpStatus.FORBIDDEN);
        }

        throw new HttpException("Aucune méthode d'authentification valide fournie", HttpStatus.BAD_REQUEST);
      }
      
    async loginGoogleHost(idToken: string) {
        if (!idToken) {
          throw new HttpException("Token manquant", HttpStatus.BAD_REQUEST);
        }

        try {
          // Vérification du token Google
          const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(idToken);
          const email = decodedToken.email ?? '';
      
          // Vérification dans la base MongoDB
          const existingHost = await this.hostModel.findOne({ email }).exec();
          if (!existingHost) {
            throw new HttpException("L'email n'est pas trouvé dans la base de données.", HttpStatus.UNAUTHORIZED);
          }
          
          // Check if email is verified
          if (!existingHost.emailVerified) {
            throw new HttpException("Veuillez vérifier votre email avant de vous connecter", HttpStatus.FORBIDDEN);
          }
      
          // Récupération du user Firebase (au cas où besoin de forcer des claims)
          const userRecord = await this.firebaseAdminService.firebaseApp.auth().getUserByEmail(email);
      
          //Récupérer le custom claim (role)
          const claims = decodedToken;
          const role = claims.role || 'host'; // Par défaut : host
      
          return {
            message: "Authentification réussie via Google",
            user: existingHost, // On retourne l'hôte de la BDD (plus complet)
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
      
    async getHosts(): Promise<Host[]> {
        return await this.hostModel.find().exec();
    }

    async findByFirebaseId(firebaseUid: string) {
      return this.hostModel.findOne({ firebaseUid });
    }    

    async getHostById(id: string): Promise<Host> {
        const host = await this.hostModel.findById(id).exec();
        if (!host) {
            throw new NotFoundException('Hôte non trouvé.');
        }
        return host;
    }

    async findByFirebaseUid(firebaseUid: string): Promise<Host> {
        const host = await this.hostModel.findOne({ firebaseUid }).exec();
        
        if (!host) {
            throw new NotFoundException(`Host with Firebase UID "${firebaseUid}" not found`);
        }
        
        return host;
    }

    


    async updateHost(id: string, updateHostDto: Partial<CreateHostDto>): Promise<Host> {
        const updatedHost = await this.hostModel.findByIdAndUpdate(id, updateHostDto, { new: true }).exec();
        if (!updatedHost) {
            throw new NotFoundException('Hôte non trouvé.');
        }
        return updatedHost;
    }

    async getHostByEmail(email: string): Promise<Host> {
        const host = await this.hostModel.findOne({ email }).exec();
        if (!host) {
          throw new NotFoundException(`Hôte avec email ${email} non trouvé.`);
        }
        return host;
    }

    async verifyToken(token: string): Promise<any> {
        try {
            const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(token);
            
            if (!decodedToken || !decodedToken.email) {
                throw new UnauthorizedException('Invalid token or missing email in token.');
            }
            
            return decodedToken;
        } catch (error) {
            if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
                throw error;
            }
            
            if (error.code === 'auth/id-token-expired') {
                throw new UnauthorizedException('Authentication token has expired. Please login again.');
            }
            
            if (error.code === 'auth/id-token-revoked' || error.code === 'auth/invalid-id-token') {
                throw new UnauthorizedException('Invalid authentication token. Please login again.');
            }
            
            console.error('Error verifying token:', error);
            throw new InternalServerErrorException('Failed to authenticate using the provided token.');
        }
    }

    async findOneByEmail(email: string): Promise<Host | null> {
        if (!validator.isEmail(email)) {
          throw new Error('Invalid email format');
        }
        return this.hostModel.findOne({ email }).exec();
    }
    
    async updatePasswordInFirebase(email: string, newPassword: string) {
        try {
          const userRecord = await this.firebaseAdminService.firebaseApp.auth().getUserByEmail(email);
          
          if (!userRecord) {
            console.error('User not found in Firebase for email:', email);
            return null;
          }
      
          await this.firebaseAdminService.firebaseApp.auth().updateUser(userRecord.uid, {
            password: newPassword,
          });
      
          console.log('Password updated in Firebase for user:', userRecord.uid);
          return userRecord;
        } catch (error) {
          console.error("Error updating password in Firebase:", error);
          return null;
        }
    }

    // New method to resend verification email
   /* async resendVerificationEmail(email: string): Promise<boolean> {
        try {
            const host = await this.hostModel.findOne({ email }).exec();
            if (!host) {
                throw new NotFoundException(`Host with email ${email} not found.`);
            }
            
            if (host.emailVerified) {
                return false; // Email already verified, no need to resend
            }
            
            await this.sendVerificationEmail(email);
            return true;
        } catch (error) {
            console.error(`Failed to resend verification email: ${error.message}`);
            throw new InternalServerErrorException('Failed to resend verification email');
        }
    }*/

    async deleteHost( firebaseUid: string): Promise<{ success: boolean; message: string }> {
        try {
            
            // Trouver l'utilisateur dans MongoDB
            const user = await this.hostModel.findOne({ firebaseUid }).exec();
            if (!user) {
                throw new NotFoundException('User not found in database');
            }
      
      
            // Suppression des fichiers de Firebase Storage
            try {
                // Si l'utilisateur a des URLs de fichiers, on peut les supprimer de Firebase Storage
                const bucket = this.firebaseAdminService.firebaseApp.storage().bucket();
                
                // Fonction pour supprimer un fichier à partir de son URL
                const deleteFileFromUrl = async (fileUrl: string) => {
                    if (!fileUrl) return;
                    
                    try {
                        // Extraire le chemin du fichier à partir de l'URL
                        const urlObj = new URL(fileUrl);
                        const filePath = urlObj.pathname.split('/o/')[1];
                        if (filePath) {
                            const decodedPath = decodeURIComponent(filePath);
                            await bucket.file(decodedPath).delete();
                            console.log(`File deleted: ${decodedPath}`);
                        }
                    } catch (error) {
                        console.error(`Failed to delete file: ${fileUrl}`, error);
                        // On continue même si la suppression d'un fichier échoue
                    }
                };
                
                // Supprimer les fichiers associés
                if (user.kbisOrId) await deleteFileFromUrl(user.kbisOrId);
                if (user.proxy) await deleteFileFromUrl(user.proxy);
                if (user.repId) await deleteFileFromUrl(user.repId);
                
            } catch (storageError) {
                console.error('Error deleting files from storage:', storageError);
                // Continue despite storage deletion errors
            }
      
            // Supprimer de Firebase Authentication
            try {
                await this.firebaseAdminService.firebaseApp.auth().deleteUser(firebaseUid);
            } catch (firebaseError) {
                // Continuer si l'utilisateur n'existe pas déjà dans Firebase
                if (firebaseError.code !== 'auth/user-not-found') {
                    throw firebaseError;
                }
            }
      
            // Supprimer de MongoDB
            await this.hostModel.deleteOne({ firebaseUid }).exec();
      
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
}