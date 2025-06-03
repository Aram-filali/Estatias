import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingService } from './app.service';
import { CreateBookingDto } from './dto/booking.dto';
import { BookingEmailService } from './email/booking-email.service';

@Controller()
export class BookingController {
  private readonly logger = new Logger(BookingController.name);
  
  constructor(
    private readonly bookingService: BookingService,
    private readonly bookingEmailService: BookingEmailService
  ) {}

  @MessagePattern('create_booking')
  async create(@Payload() createBookingDto: CreateBookingDto) {
    this.logger.log(`Received create_booking request from host: ${createBookingDto.hostId}`);
    this.logger.log(`Received create_booking request for property: ${createBookingDto.propertyId}`);
    try {
      // Always ensure status is set to pending for new bookings
      createBookingDto.status = 'pending';
      
      // Forward to service
      const result = await this.bookingService.create(createBookingDto);
      return result;
    } catch (error) {
      this.logger.error(`Error in create_booking controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to process booking request: ${error.message}`,
        error: error.message
      };
    }
  }

  @MessagePattern('find_booking_by_id')
  async findById(@Payload() id: string) {
    this.logger.log(`Received find_booking_by_id request for booking: ${id}`);
    try {
      const result = await this.bookingService.findById(id);
      return result;
    } catch (error) {
      this.logger.error(`Error in find_booking_by_id controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to retrieve booking: ${error.message}`,
        error: error.message
      };
    }
  }

   @MessagePattern('find_bookings_by_email')
    async findByEmail(@Payload() email: string) {
      this.logger.log(`Received find_bookings_by_email request for email: ${email}`);
      try {
        const result = await this.bookingService.findByEmail(email);
        return result;
      } catch (error) {
        this.logger.error(`Error in find_bookings_by_email controller: ${error.message}`, error.stack);
        return {
          statusCode: 500,
          message: `Failed to retrieve bookings: ${error.message}`,
          error: error.message
        };
      }
    }


   @MessagePattern('find_all_bookings')
  async findAll(@Payload() filters: any = {}) {
    this.logger.log(`Received find_all_bookings request with filters: ${JSON.stringify(filters)}`);
    try {
      const result = await this.bookingService.findAll(filters);
      return result;
    } catch (error) {
      this.logger.error(`Error in find_all_bookings controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to retrieve bookings: ${error.message}`,
        error: error.message
      };
    }
  }

@MessagePattern('find_host_bookings')
async findBookingsByHost(@Payload() filters: any) {
  this.logger.log(`Received find_host_bookings request with filters: ${JSON.stringify(filters)}`);
  try {
    // Ensure hostId is properly passed and validated
    if (!filters.hostId) {
      return {
        statusCode: 400,
        message: 'Host ID is required',
        error: 'Bad Request'
      };
    }

    // Use the service method instead of direct model access
    const bookings = await this.bookingService.findByHostId(filters);
    
    return {
      statusCode: 200,
      message: 'Host bookings retrieved successfully',
      data: bookings,
    };
  } catch (error) {
    this.logger.error(`Error in find_host_bookings: ${error.message}`, error.stack);
    return {
      statusCode: 500,
      message: `Failed to retrieve host bookings: ${error.message}`,
      error: error.message
    };
  }
}

  @MessagePattern('resend_booking_confirmation_email')
  async resendConfirmationEmail(@Payload() id: string) {
    this.logger.log(`Received resend_booking_confirmation_email request for booking: ${id}`);
    try {
      // First retrieve the booking
      const bookingResult = await this.bookingService.findById(id);
      
      if (bookingResult.statusCode !== 200) {
        return bookingResult; // Return the error from findById
      }
      
      // Send the confirmation email
      const emailResult = await this.bookingEmailService.sendBookingConfirmationEmail(bookingResult.data);
      
      if (emailResult) {
        return {
          statusCode: 200,
          message: 'Booking confirmation email resent successfully',
          bookingId: id
        };
      } else {
        return {
          statusCode: 400,
          message: 'Failed to resend booking confirmation email',
          bookingId: id
        };
      }
    } catch (error) {
      this.logger.error(`Error in resend_booking_confirmation_email controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to resend confirmation email: ${error.message}`,
        error: error.message
      };
    }
  }

  @MessagePattern('update_booking_status')
  async updateStatus(@Payload() data: { id: string, status: 'approved' | 'rejected' }) {
    this.logger.log(`Received update_booking_status request for booking: ${data.id} to status: ${data.status}`);
    
    if (!data.id || !data.status) {
      return {
        statusCode: 400,
        message: 'Both bookingId and status are required',
      };
    }
    
    if (!['approved', 'rejected'].includes(data.status)) {
      return {
        statusCode: 400,
        message: 'Status must be either "approved" or "rejected"',
      };
    }
    
    try {
      const result = await this.bookingService.updateStatus(data.id, data.status);
      return result;
    } catch (error) {
      this.logger.error(`Error in update_booking_status controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to update booking status: ${error.message}`,
        error: error.message
      };
    }
  }


  @MessagePattern('cancel_booking')
  async cancelBooking(@Payload() data: { id: string }) {
    this.logger.log(`Received cancel_booking request for booking: ${data.id}`);
    
    if (!data.id) {
      return {
        statusCode: 400,
        message: 'Booking ID is required',
      };
    }
    
    try {
      const result = await this.bookingService.cancelBooking(data.id);
      return result;
    } catch (error) {
      this.logger.error(`Error in cancel_booking controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to cancel booking: ${error.message}`,
        error: error.message
      };
    }
  }



  // Add new message pattern for updating payment method
  @MessagePattern('update_booking_payment_method')
  async updatePaymentMethod(@Payload() payload: { bookingId: string, paymentMethod: string }) {
    this.logger.log(`Received update_booking_payment_method request for booking: ${payload.bookingId}`);
    try {
      const { bookingId, paymentMethod } = payload;
      
      // Validate input
      if (!bookingId || !paymentMethod) {
        return {
          statusCode: 400,
          message: 'Booking ID and payment method are required',
          error: 'Missing required parameters'
        };
      }
      
      // Forward to service
      const result = await this.bookingService.updatePaymentMethod(bookingId, paymentMethod);
      return result;
    } catch (error) {
      this.logger.error(`Error in update_booking_payment_method controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to update payment method: ${error.message}`,
        error: error.message
      };
    }
  }


  // Add new message pattern for confirming offline payments
  @MessagePattern('confirm_offline_payment')
  async confirmOfflinePayment(@Payload() payload: { bookingId: string }) {
    this.logger.log(`Received confirm_offline_payment request for booking: ${payload.bookingId}`);
    try {
      const { bookingId } = payload;
      
      // Validate input
      if (!bookingId) {
        return {
          statusCode: 400,
          message: 'Booking ID is required',
          error: 'Missing required parameter'
        };
      }
      
      // Forward to service
      const result = await this.bookingService.confirmOfflinePayment(bookingId);
      return result;
    } catch (error) {
      this.logger.error(`Error in confirm_offline_payment controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to confirm offline payment: ${error.message}`,
        error: error.message
      };
    }
  }

  @MessagePattern('update_booking')
  async update(@Payload() payload: { id: string; updateData: Partial<CreateBookingDto> }) {
    this.logger.log(`Received update_booking request for booking ID: ${payload.id}`);
    this.logger.log(`Update data: ${JSON.stringify(payload.updateData)}`);
    
    try {
      const result = await this.bookingService.update(payload.id, payload.updateData);
      return result;
    } catch (error) {
      this.logger.error(`Error in update_booking controller: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to update booking: ${error.message}`,
        error: error.message
      };
    }
  }

   @MessagePattern('booking_paid')
  async handleBookingPaid(@Payload() paymentData: any) {
    this.logger.log(`Received booking_paid event for booking: ${paymentData.bookingId}`);
    this.logger.log(`Payment data:`, paymentData);

    try {
      const result = await this.bookingService.confirmBookingPayment(paymentData);
      return result;
    } catch (error) {
      this.logger.error(`Error handling booking_paid event: ${error.message}`, error.stack);
      return {
        statusCode: 500,
        message: `Failed to process booking payment: ${error.message}`,
        error: error.message
      };
    }
  }

}