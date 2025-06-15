import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern} from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { HostService } from '../app.service';




interface PropertyStatusNotification {

  hostId: string;
  status: string;
  propertyTitle: string;
 
}

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly hostService: HostService,
  ) {}

  @MessagePattern({ cmd: 'send_status_update_notification' })
  async sendStatusUpdateNotification(@Payload() data: { hostId: string; status: string }) {
    const { hostId, status } = data;

    if (!hostId || !status) {
      return { 
        statusCode: 400, 
        error: '⚠️ Host ID and status are required' 
      };
    }

    try {
      // Send the notification email
      await this.notificationService.sendStatusUpdateEmail(hostId, status);
      
      this.logger.log(`Status update notification sent for host ${hostId} with status: ${status}`);
      
      return { 
        statusCode: 200, 
        message: `📩 Status update notification sent successfully for status: ${status}` 
      };
    } catch (error) {
      this.logger.error('❌ Error sending status update notification:', error);
      return { 
        statusCode: 500, 
        error: '❌ Error sending the notification email' 
      };
    }
  }


  // New event handler for property status updates
  @EventPattern('property_status_updated')
  async handlePropertyStatusUpdate(@Payload() data: PropertyStatusNotification) {
    this.logger.log(`Received property status update notification for host: ${data.hostId}, status: ${data.status}`);
    
    try {
      // Send status update email notification using firebaseUid
      await this.notificationService.sendPropertyStatusUpdateEmail(data.hostId, data.status);
      this.logger.log(`Property status update email sent to host: ${data.hostId}`);
    } catch (error) {
      this.logger.error(`Error handling property status update notification: ${error.message}`, error.stack);
    }
  }
}