import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from '../schema/admin.schema';
import * as admin from 'firebase-admin';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) {}

  async loginAdmin(idToken: string = '') {
    if (idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('Decoded token:', decodedToken); // Ajout du log pour débogage
        const firebaseUid = decodedToken.uid;
  
        // Chercher l'admin en base
        const adminInDb = await this.adminModel.findOne({ firebaseUid });
        console.log('Admin from DB:', adminInDb); // Log pour vérifier l'admin trouvé
  
        if (!adminInDb) {
          throw new HttpException("Aucun admin correspondant trouvé dans la base.", HttpStatus.UNAUTHORIZED);
        }
  
        return {
          message: "Authentification réussie via Firebase",
          user: {
            email: adminInDb.email,
            role: adminInDb.role,
            id: adminInDb._id,
          }
        };
      } catch (error) {
        console.error('Error during Firebase authentication:', error); // Log d'erreur pour le débogage
        throw new HttpException("Échec de l'authentification avec le token", HttpStatus.UNAUTHORIZED);
      }
    }

    throw new HttpException("Aucune méthode d'authentification valide fournie", HttpStatus.BAD_REQUEST);
  }


  /*async findByEmail(email: string): Promise<Admin | null> {
    return this.adminModel.findOne({ email }).exec();
  }*/

  /*async create(adminData: Partial<Admin>): Promise<Admin> {
    const newAdmin = new this.adminModel(adminData);
    return newAdmin.save();
  }*/

  async findAll(): Promise<Admin[]> {
    return this.adminModel.find().exec();
  }
}