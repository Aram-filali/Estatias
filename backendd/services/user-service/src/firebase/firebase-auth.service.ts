import { Injectable } from '@nestjs/common';
import { FirebaseAdminService } from './firebase'; 
import { FirebaseClientService } from './firebase-client.service';
import * as bcrypt from 'bcryptjs'; 
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from '../dto/create-user.dto'; 
import { User } from '../schema/user.schema';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class FirebaseAuthService {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly firebaseClientService: FirebaseClientService, 
    @InjectModel(User.name) private userModel: Model<User> 
  ) {}

  /*async signupUserFirebase(fullname: string, email: string, password: string) {
    const userExists = await this.findOneByEmail(email);
    if (userExists) {
      throw new Error('User already exists');
    }

    const firebaseUser = await this.firebaseAdminService.firebaseApp.auth().createUser({
      displayName: fullname, 
      email,
      password,
    });
    console.log('firebase user: ', firebaseUser);

    return firebaseUser;
  }

  async signupUser(fullname: string, email: string, password: string) {
    const userExists = await this.findOneByEmail(email);
    if (userExists) {
      throw new Error('User already exists');
    }

    let hashedPassword: string | null = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const firebaseUser = await this.signupUserFirebase(fullname, email, password);

    const newUser = await this.createUser({
      fullname,
      email,
      password: hashedPassword || '',
      firebaseUid: firebaseUser.uid, 
    });
    console.log('User created in the database: ', newUser);

    return newUser;
  }*/

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    const user = new this.userModel(userData); 
    return await user.save(); 
  }

  async loginUser(idToken: string, email: string, password: string) {
    if (idToken) {
      try {
        const decodedToken = await this.firebaseAdminService.firebaseApp.auth().verifyIdToken(idToken);
        return decodedToken; 
      } catch (error) {
        console.error('Error verifying token:', error);
        throw new HttpException('Failed to authenticate token', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    if (email && password) {
      try {
        const idToken = await this.firebaseClientService.signInWithEmailPassword(email, password);
        
        if (idToken) {
          const userCredential = await this.firebaseClientService.auth.currentUser;
          const user = userCredential;

          if (user) {
            return { user, idToken }; 
          } else {
            throw new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED);
          }
        } else {
          throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
        }
      } catch (error) {
        console.error('Error signing in with email and password:', error);
        throw new HttpException('Failed to authenticate with email and password', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    throw new HttpException('No valid authentication method provided', HttpStatus.BAD_REQUEST);
  }

  async getUser(uid: string) {
    return this.firebaseAdminService.firebaseApp.auth().getUser(uid);
  }

  async deleteUser(uid: string) {
    return this.firebaseAdminService.firebaseApp.auth().deleteUser(uid);
  }

  async validateGoogleToken(idToken: string) {
    try {
      const decodedToken = await this.firebaseAdminService.verifyIdToken(idToken);
      console.log('Decoded Token:', decodedToken);
      return decodedToken; 
    } catch (error) {
      console.error('Error during Firebase token validation:', error);
      throw new Error('Invalid token');
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
  
  async updatePasswordInMongo(email: string, newPassword: string) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log('Hashed password:', hashedPassword);
  
      const user = await this.userModel.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true }
      );
  
      if (!user) {
        console.error('User not found in MongoDB for the email:', email);
        return null;
      }
  
      console.log('Password updated in MongoDB for the user:', user);
      return user;
    } catch (error) {
      console.error("Error during password update in MongoDB:", error);
      return null;
    }
  }
}
