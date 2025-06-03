import { Controller } from '@nestjs/common';
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
async updateHostDocuments(@Payload() data: { hostId: string, files: any, documentData: any }) {
  try {
    const { hostId, files, documentData } = data;
    
    // Validate the required data
    if (!hostId) {
      return { statusCode: 400, error: 'Host ID is required' };
    }
    
    // Call the service to update documents
    const updatedHost = await this.hostProfileService.updateHostDocuments(
      hostId,
      files,
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

@MessagePattern('get_host_documents')
async getHostDocuments(@Payload() hostId: string) {
  return this.hostProfileService.getHostDocuments(hostId);
}

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