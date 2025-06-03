import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingEmailService } from './booking-email.service';

@Controller()
export class BookingEmailController {
  private readonly logger = new Logger(BookingEmailController.name);
  
  constructor(private readonly emailService: BookingEmailService) {}

  @MessagePattern('send_booking_confirmation_email')
  async sendBookingConfirmationEmail(@Payload() bookingData: any) {
    this.logger.log(`Received request to send booking confirmation email for booking: ${bookingData.id}`);
    
    try {
      const result = await this.emailService.sendBookingConfirmationEmail(bookingData);
      
      if (result) {
        return { 
          statusCode: 200, 
          message: 'Booking confirmation email sent successfully' 
        };
      } else {
        return { 
          statusCode: 400, 
          message: 'Failed to send booking confirmation email' 
        };
      }
    } catch (error) {
      this.logger.error(`Error sending booking confirmation email: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to send booking confirmation email: ${error.message}`,
        error: error.message
      };
    }
  }

  @MessagePattern('test_booking_email')
  async testEmailDelivery(@Payload() data: { testEmail: string }) {
    const { testEmail } = data;
    
    if (!testEmail) {
      return { error: '⚠️ Test email address is required' };
    }
    
    try {
      const result = await this.emailService.testEmailDelivery(testEmail);
      return { 
        statusCode: 200,
        message: '📩 Test email sent successfully',
        details: result 
      };
    } catch (error) {
      this.logger.error('❌ Error sending test email:', error);
      return { 
        statusCode: 500,
        message: '❌ Error sending the test email',
        error: error.message 
      };
    }
  }


  @MessagePattern('send_booking_status_email')
async sendBookingStatusEmail(@Payload() data: { bookingId: string, status: 'approved' | 'rejected',booking: any }) {
  this.logger.log(`Received request to send ${data.status} email for booking: ${data.bookingId}`);
  
  if (!data.bookingId || !data.status) {
    return {
      statusCode: 400,
      message: 'Both bookingId and status are required',
    };
  }
  
  try {
    // First, we need to get the booking data
    // This is typically done by the service, but we could implement a direct way
    // to fetch a booking if needed
    
    // For this example, we'll assume we have the booking data in the payload
    // In a real implementation, you might want to fetch the booking from the database
    
    if (data.status === 'approved') {
      const result = await this.emailService.sendBookingApprovedEmail(data.booking);
      return {
        statusCode: 200,
        message: 'Booking approval email sent successfully',
      };
    } else if (data.status === 'rejected') {
      const result = await this.emailService.sendBookingRejectedEmail(data.booking);
      return {
        statusCode: 200,
        message: 'Booking rejection email sent successfully',
      };
    } else {
      return {
        statusCode: 400,
        message: 'Invalid status provided. Status must be "approved" or "rejected"',
      };
    }
  } catch (error) {
    this.logger.error(`Error sending booking status email: ${error.message}`, error.stack);
    return {
      statusCode: 500,
      message: `Failed to send booking status email: ${error.message}`,
      error: error.message
    };
  }
}
}