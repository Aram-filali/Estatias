import { Injectable,NotFoundException,InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Host, HostDocument } from '../../schema/host.schema';
import { UpdateProfileDto } from './updateProfile.dto';
import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { HostService } from '../../app.service';

@Injectable()
export class UpdateProfileService {
  constructor(
    @InjectModel(Host.name) private hostModel: Model<HostDocument>,
    private readonly hostService: HostService,
  ) {}

  async getHostByFirebaseUid(firebaseUid: string): Promise<any> {
    const host = await this.hostModel.findOne({ firebaseUid }).exec();
    
    if (!host) {
      throw new Error('Host not found');
    }

    return {
      profile: {
        id: host.firebaseUid,
        name: host.isAgency ? host.businessName : `${host.firstName} ${host.lastName}`,
        businessname: host.businessName,
        headoffice: host.headOffice,
        firstname: host.firstName,
        lastname: host.lastName,
        email: host.email,
        phoneNumber: host.phoneNumber,
        country: host.country,
        status: 'active', 
        websiteUrl: '', 
        notifications: [], 
        isAgency: host.isAgency,
      }
    };
  }

  async updateProfile(hostId: string, updateProfileDto: UpdateProfileDto): Promise<any> {
    console.log('Updating profile for host:', hostId);
    console.log('Update data received:', updateProfileDto);
    
    // Trouver l'hôte par son ID Firebase
    const host = await this.hostModel.findOne({ firebaseUid: hostId }).exec();
    
    if (!host) {
      console.error('Host not found with ID:', hostId);
      throw new Error('Host not found');
    }
    
    console.log('Found host:', host);
    
    // Préparer l'objet de mise à jour avec tous les champs pertinents
    const updateData: any = {};
    
    // Mettre à jour selon le type (agence ou individuel)
    updateData.isAgency = updateProfileDto.isAgency;
    
    if (updateProfileDto.isAgency) {
      if (updateProfileDto.businessname) updateData.businessName = updateProfileDto.businessname;
      if (updateProfileDto.headoffice) updateData.headOffice = updateProfileDto.headoffice;
    } else {
      if (updateProfileDto.firstname) updateData.firstName = updateProfileDto.firstname;
      if (updateProfileDto.lastname) updateData.lastName = updateProfileDto.lastname;
    }
    
    // Autres champs à mettre à jour
    if (updateProfileDto.country) updateData.country = updateProfileDto.country;
    if (updateProfileDto.email) updateData.email = updateProfileDto.email;
    if (updateProfileDto.phoneNumber) updateData.phoneNumber = updateProfileDto.phoneNumber;
    if (updateProfileDto.address) updateData.address = updateProfileDto.address;
    if (updateProfileDto.websiteUrl) updateData.websiteUrl = updateProfileDto.websiteUrl;
    
    console.log('Update data prepared:', updateData);
    
    // Utiliser findOneAndUpdate pour mise à jour atomique
    const updatedHost = await this.hostModel.findOneAndUpdate(
      { firebaseUid: hostId },
      { $set: updateData },
      { new: true, runValidators: true } // Pour retourner le document mis à jour et valider les schémas
    ).exec();
    
    if (!updatedHost) {
      console.error('Update failed for host:', hostId);
      throw new Error('Update failed');
    }
    
    console.log('Host updated successfully:', updatedHost);
    
    // Retourner le profil mis à jour au format attendu
    return {
      profile: {
        id: updatedHost.firebaseUid,
        name: updatedHost.isAgency ? updatedHost.businessName : `${updatedHost.firstName} ${updatedHost.lastName}`,
        businessname: updatedHost.businessName,
        headoffice: updatedHost.headOffice,
        firstname: updatedHost.firstName,
        lastname: updatedHost.lastName,
        email: updatedHost.email,
        phoneNumber: updatedHost.phoneNumber,
        country: updatedHost.country,
        status: 'active',
        websiteUrl: '',
        notifications: [],
        isAgency: updatedHost.isAgency,
      }
    };
  }

  async updateHostDocuments(hostId: string, files: any, documentData: any): Promise<Host> {
    try {
      // Find the host by ID first
      const host = await this.hostModel.findById(hostId).exec();
      if (!host) {
        throw new NotFoundException('Hôte non trouvé.');
      }
      
      const updateData: any = {};
      
      // Process hasRepresentative and isAgency flags
      updateData.hasRepresentative = documentData.hasRepresentative === 'true';
      updateData.isAgency = documentData.isAgency === 'true';
      
      // Set up the uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads', hostId);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Process each potential document file
      const fileTypes = ['kbisOrId', 'proxy', 'repId'];
      
      for (const type of fileTypes) {
        if (files?.[type]?.[0]) {
          const file = files[type][0];
          const fileExt = file.originalname.split('.').pop();
          const fileName = `${type}-${uuidv4()}.${fileExt}`;
          const filePath = path.join(uploadsDir, fileName);
          
          // Check if buffer exists and handle it properly
          if (file.buffer) {
            // Convert to Buffer if it's not already a Buffer
            const fileBuffer = Buffer.isBuffer(file.buffer) 
              ? file.buffer 
              : Buffer.from(file.buffer);
            
            // Write the buffer to a file
            fs.writeFileSync(filePath, fileBuffer);
            
            // Store the file path in the database
            updateData[type] = fileName;
          } else {
            // Log that there's no buffer available
            console.warn(`No buffer available for ${type}`);
          }
        }
      }
      
      // Update the host document with new data
      const updatedHost = await this.hostModel.findByIdAndUpdate(
        hostId,
        { $set: updateData },
        { new: true }
      ).exec();
      
      if (!updatedHost) {
        throw new NotFoundException('Erreur lors de la mise à jour: hôte introuvable.');
      }
      
      return updatedHost as unknown as Host;
    } catch (error) {
      console.error("Error updating host documents:", error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Erreur lors de la mise à jour des documents: ${error.message}`);
    }
  }

  async getHostDocuments(hostId: string) {
    try {
      const host = await this.hostService.findByFirebaseId(hostId);
      
      if (!host) {
        throw new NotFoundException('Host not found');
      }
      
      // Renvoyer uniquement les informations sur les documents
      return {
        kbisOrId: host.kbisOrId || null,
        proxy: host.proxy || null,
        repId: host.repId || null,
        hasRepresentative: host.hasRepresentative || false,
        isAgency: host.isAgency || false
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Error fetching host documents: ${error.message}`);
    }
  }
  
}



