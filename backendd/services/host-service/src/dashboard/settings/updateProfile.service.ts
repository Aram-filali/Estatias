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



  async getHostSocialsByFirebaseUid(firebaseUid: string): Promise<any> {
  const host = await this.hostModel.findOne({ firebaseUid }).exec();
      
  if (!host) {
    throw new Error('Host not found');
  }

  // Return only social media links
  return {
    socials: {
      facebook: host.facebookUrl || null,
      instagram: host.instagramUrl || null,
      linkedin: host.linkedinUrl || null,
      twitter: host.twitterUrl || null,
      youtube: host.youtubeUrl || null,
      tiktok: host.tiktokUrl || null
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


  // 4. Host Service (Add this method to your existing host service)
async updateSocialLinks(hostId: string, socialLinksDto: any): Promise<any> {
  console.log('Updating social links for host:', hostId);
  console.log('Social links data received:', socialLinksDto);
       
  // Find host by Firebase ID
  const host = await this.hostModel.findOne({ firebaseUid: hostId }).exec();
       
  if (!host) {
    console.error('Host not found with ID:', hostId);
    throw new Error('Host not found');
  }
       
  console.log('Found host:', host);
       
  // Prepare update object for social media links
  const updateData: any = {};
       
  if (socialLinksDto.facebookUrl !== undefined) updateData.facebookUrl = socialLinksDto.facebookUrl;
  if (socialLinksDto.instagramUrl !== undefined) updateData.instagramUrl = socialLinksDto.instagramUrl;
  if (socialLinksDto.linkedinUrl !== undefined) updateData.linkedinUrl = socialLinksDto.linkedinUrl;
  if (socialLinksDto.twitterUrl !== undefined) updateData.twitterUrl = socialLinksDto.twitterUrl;
  if (socialLinksDto.youtubeUrl !== undefined) updateData.youtubeUrl = socialLinksDto.youtubeUrl;
  if (socialLinksDto.tiktokUrl !== undefined) updateData.tiktokUrl = socialLinksDto.tiktokUrl;
       
  console.log('Social links update data prepared:', updateData);
       
  // Use findOneAndUpdate for atomic update
  const updatedHost = await this.hostModel.findOneAndUpdate(
    { firebaseUid: hostId },
    { $set: updateData },
    { new: true, runValidators: true }
  ).exec();
       
  if (!updatedHost) {
    console.error('Social links update failed for host:', hostId);
    throw new Error('Update failed');
  }
       
  console.log('Host social links updated successfully:', updatedHost);
       
  // Return updated profile
  return {
    profile: {
      id: updatedHost.firebaseUid,
      name: updatedHost.isAgency ? updatedHost.businessName : `${updatedHost.firstName} ${updatedHost.lastName}`,
      socialLinks: {
        facebookUrl: updatedHost.facebookUrl,
        instagramUrl: updatedHost.instagramUrl,
        linkedinUrl: updatedHost.linkedinUrl,
        twitterUrl: updatedHost.twitterUrl,
        youtubeUrl: updatedHost.youtubeUrl,
        tiktokUrl: updatedHost.tiktokUrl,
      }
    }
  };
}

  async updateHostDocuments(hostId: string, documentData: any): Promise<Host> {
    try {
      // Find the host by ID first
      const host = await this.hostModel.findById(hostId).exec();
      if (!host) {
        throw new NotFoundException('Hôte non trouvé.');
      }
      
      const updateData: any = {};
      
      // Process hasRepresentative and isAgency flags
      updateData.hasRepresentative = documentData.hasRepresentative;
      updateData.isAgency = documentData.isAgency;
      
      // Update document URLs from Firebase Storage (if provided)
      if (documentData.kbisOrId) {
        updateData.kbisOrId = documentData.kbisOrId;
      }
      
      if (documentData.proxy) {
        updateData.proxy = documentData.proxy;
      }
      
      if (documentData.repId) {
        updateData.repId = documentData.repId;
      }
      
      // If hasRepresentative is false, clear representative documents
      if (!documentData.hasRepresentative) {
        updateData.proxy = null;
        updateData.repId = null;
      }
      
      console.log('Updating host with data:', updateData);
      
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

  // In your host service file:

  async getHostDocuments(firebaseUid: string) {
    try {
      console.log('Searching for host with firebaseUid:', firebaseUid);
      
      // Make sure you're using the correct field name from your schema
      const host = await this.hostService.findByFirebaseId(firebaseUid);
      
      if (!host) {
        console.log('Host not found for firebaseUid:', firebaseUid);
        throw new NotFoundException(`Host not found with firebaseUid: ${firebaseUid}`);
      }
      
      console.log('Host found:', {
        firebaseUid: host.firebaseUid,
        email: host.email,
        kbisOrId: host.kbisOrId ? 'Present' : 'Missing',
        proxy: host.proxy ? 'Present' : 'Missing',
        repId: host.repId ? 'Present' : 'Missing',
        hasRepresentative: host.hasRepresentative,
        isAgency: host.isAgency
      });
      
      // Return the Firebase Storage URLs directly
      const result = {
        firebaseUid: host.firebaseUid, // Include firebaseUid in response
        kbisOrId: host.kbisOrId || null,
        proxy: host.proxy || null,
        repId: host.repId || null,
        hasRepresentative: host.hasRepresentative || false,
        isAgency: host.isAgency || false,
        // Include other relevant host info if needed
        email: host.email,
        businessName: host.businessName || null,
        firstName: host.firstName || null,
        lastName: host.lastName || null
      };
      
      console.log('Returning documents:', result);
      
      return result;
    } catch (error) {
      console.error('Error in getHostDocuments service:', error);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Error fetching host documents: ${error.message}`);
    }
  }
}



