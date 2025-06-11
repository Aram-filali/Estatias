import { Controller, NotFoundException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UpdateProfileService } from './updateProfile.service';
import { UpdateProfileDto } from './updateProfile.dto';
import * as path from 'path';
import * as fs from 'fs';

@Controller()
export class UpdateProfileController {
  constructor(private readonly hostProfileService: UpdateProfileService) {}

  @MessagePattern({ cmd: 'get_host_profile' })
  async getHostProfile(data: { firebaseUid: string }) {
    try {
      const profile = await this.hostProfileService.getHostByFirebaseUid(data.firebaseUid);
      return {
        statusCode: 200,
        data: profile
      };
    } catch (error) {
      return {
        statusCode: 404,
        error: error.message || 'Host profile not found'
      };
    }
  }

  @MessagePattern({ cmd: 'get_host_socials' })
  async getHostSocials(data: { firebaseUid: string }) {
    try {
      const socials = await this.hostProfileService.getHostSocialsByFirebaseUid(data.firebaseUid);
      return {
        statusCode: 200,
        data: socials
      };
    } catch (error) {
      return {
        statusCode: 404,
        error: error.message || 'Host social links not found'
      };
    }
  }

  @MessagePattern({ cmd: 'update_host_profile' })
  async updateHostProfile(data: { hostId: string, updateProfileDto: UpdateProfileDto }) {
    try {
      const updatedProfile = await this.hostProfileService.updateProfile(
        data.hostId,
        data.updateProfileDto
      );
      return {
        statusCode: 200,
        data: updatedProfile
      };
    } catch (error) {
      return {
        statusCode: 400,
        error: error.message || 'Error updating host profile'
      };
    }
  }




  // 3. Host Microservice Controller (Add this method to your existing host controller)
@MessagePattern({ cmd: 'update_host_social_links' })
async updateHostSocialLinks(data: { hostId: string, socialLinksDto: any }) {
  try {
    const updatedProfile = await this.hostProfileService.updateSocialLinks(
      data.hostId,
      data.socialLinksDto
    );
    return {
      statusCode: 200,
      data: updatedProfile
    };
  } catch (error) {
    return {
      statusCode: 400,
      error: error.message || 'Error updating social links'
    };
  }
}

  @MessagePattern({ cmd: 'mark_notifications_read' })
  async markNotificationsRead(data: { hostId: string, notificationIds: number[] }) {
    try {
      // This would connect to your notification service logic
      // For now returning a mock successful response
      return {
        statusCode: 200,
        data: { success: true, message: 'Notifications marked as read' }
      };
    } catch (error) {
      return {
        statusCode: 400,
        error: error.message || 'Error marking notifications as read'
      };
    }
  }

@MessagePattern({ cmd: 'update_host_documents' })
async updateHostDocuments(@Payload() data: { hostId: string, documentData: any }) {
  try {
    const { hostId, documentData } = data;
    
    // Validate the required data
    if (!hostId) {
      return { statusCode: 400, error: 'Host ID is required' };
    }
    
    // Call the service to update documents
    const updatedHost = await this.hostProfileService.updateHostDocuments(
      hostId,
      documentData
    );
    
    return { statusCode: 200, data: updatedHost };
  } catch (err) {
    console.error('Error in update_host_documents:', err);
    return { 
      statusCode: err.status || 500, 
      error: err.message || 'Error updating host documents' 
    };
  }
}

// In your host microservice controller, add this method:
// 2. Host Microservice - Host Profile Controller
@MessagePattern('get_host_documents')
async getHostDocuments(@Payload() firebaseUid: string) {
  try {
    console.log('Received request for host documents with firebaseUid:', firebaseUid);
    
    const result = await this.hostProfileService.getHostDocuments(firebaseUid);
    
    console.log('Host documents retrieved:', result);
    
    return {
      success: true,
      data: result,
      ...result // Spread the result to maintain backward compatibility
    };
  } catch (error) {
    console.error('Error in getHostDocuments controller:', error);
    
    return {
      success: false,
      error: error.message,
      statusCode: error instanceof NotFoundException ? 404 : 500
    };
  }
}

// Keep your existing getDocumentFile method for file serving if needed
@MessagePattern('get_document_file')
async getDocumentFile(@Payload() payload: { hostId: string, fileName: string }) {
  const { hostId, fileName } = payload;
  const uploadsDir = path.join(process.cwd(), 'uploads', hostId);
  const filePath = path.join(uploadsDir, fileName);

  if (fs.existsSync(filePath)) {
    return {
      exists: true,
      content: fs.readFileSync(filePath),
      contentType: this.getContentType(fileName)
    };
  } else {
    return {
      exists: false,
      content: null,
      message: 'Document not found'
    };
  }
}

private getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
      
  return contentTypes[ext] || 'application/octet-stream';
}
}