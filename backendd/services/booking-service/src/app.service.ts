import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking } from './schema/booking.schema';
import { CreateBookingDto } from './dto/booking.dto';
import { BookingEmailService } from './email/booking-email.service';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<Booking>,
    private readonly emailService: BookingEmailService,
    @Inject('HOST_SERVICE') private readonly hostServiceClient: ClientProxy,
    @Inject('PROPERTY_SERVICE') private propertyServiceClient: ClientProxy,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<any> {
    try {
      this.logger.log(`Creating booking for property: ${createBookingDto.propertyId}`);
      
      // Ensure required nested objects are present
      if (!createBookingDto.pricing) {
        throw new Error('Pricing details are required');
      }
      
      if (!createBookingDto.guests) {
        throw new Error('Guest details are required');
      }
      
      if (!createBookingDto.customer) {
        throw new Error('Customer details are required');
      }


      // Debug segments specifically
      this.logger.log(`Segments received: ${JSON.stringify(createBookingDto.segments)}`);
      this.logger.log(`Segments type: ${typeof createBookingDto.segments}`);
      this.logger.log(`Is segments array: ${Array.isArray(createBookingDto.segments)}`);
      this.logger.log(`Segments length: ${createBookingDto.segments?.length}`);

      // Validate segments
      if (!createBookingDto.segments || !Array.isArray(createBookingDto.segments) || createBookingDto.segments.length === 0) {
        throw new Error('Booking segments are required');
      }

      // Check if customer already has an active booking (not completed or canceled)
      const existingBooking = await this.bookingModel.findOne({
        'customer.email': createBookingDto.customer.email,
        status: { $nin: ['completed', 'canceled','rejected'] }, // Active bookings
      });

      if (existingBooking) {
        throw new Error('You already have an active booking. Please wait until it is completed or canceled.');
      }
      
      // Create a clean booking object with only the fields we need
      const bookingData = {
        propertyId: createBookingDto.propertyId,
        hostId: createBookingDto.hostId,
        checkInDate: createBookingDto.checkInDate,
        checkOutDate: createBookingDto.checkOutDate,
        nights: createBookingDto.nights,
        status: 'pending', // Always set to pending for new bookings
        
        // Handle nested objects with proper defaults
        guests: {
          adults: createBookingDto.guests.adults,
          children: createBookingDto.guests.children || 0,
          infants: createBookingDto.guests.infants || 0,
        },

        // Add segments with validation
        segments: createBookingDto.segments.map(segment => ({
          start_time: segment.start_time,
          end_time: segment.end_time,
          price: segment.price,
          otherPlatformPrice: segment.otherPlatformPrice,
          isPrice: segment.isPrice,
          touristTax: segment.touristTax,
        })),
        
        pricing: {
          total: createBookingDto.pricing.total,
          subtotal: createBookingDto.pricing.subtotal,
          taxAmount: createBookingDto.pricing.taxAmount,
          serviceCharge: createBookingDto.pricing.serviceCharge,
        },
        
        customer: {
          fullName: createBookingDto.customer.fullName,
          email: createBookingDto.customer.email,
          phone: createBookingDto.customer.phone,
          message: createBookingDto.customer.message || '',
          additionalMessage: createBookingDto.customer.additionalMessage || '',
        }
      };

      // Log segments for debugging
      this.logger.log(`Booking segments count: ${bookingData.segments.length}`);

      // Create and save the new booking
      const newBooking = new this.bookingModel(bookingData);
      
      const savedBooking = await newBooking.save();
      this.logger.log(`Booking created successfully with ID: ${savedBooking.id}`);
      
      // Send confirmation email
      try {
        await this.emailService.sendBookingSubmissionEmail(savedBooking);
        this.logger.log(`Confirmation email sent to ${savedBooking.customer.email}`);
      } catch (emailError) {
        this.logger.error(`Failed to send confirmation email: ${emailError.message}`, emailError.stack);
        // We don't want the booking creation to fail if the email fails to send
        // Just log the error and continue
      }

      // Emit event to host service to notify the host about the new booking
      try {
        // Prepare notification data with essential information for host
        const hostNotificationData = {
          bookingId: savedBooking.id,
          hostId: savedBooking.hostId,
          propertyId: savedBooking.propertyId,
          checkInDate: savedBooking.checkInDate,
          checkOutDate: savedBooking.checkOutDate,
          guests: savedBooking.guests,
        };
        
        // Emit event to host service
        this.hostServiceClient.emit('new_booking_created', hostNotificationData);
        this.logger.log(`Host notification event emitted for host: ${savedBooking.hostId}`);
      } catch (notificationError) {
        this.logger.error(`Failed to notify host: ${notificationError.message}`, notificationError.stack);
        // We don't want the booking creation to fail if the host notification fails
        // Just log the error and continue
      }
      
      return {
        statusCode: 201,
        message: 'Booking created successfully',
        data: savedBooking,
      };
    } catch (error) {
      this.logger.error(`Failed to create booking: ${error.message}`, error.stack);
      
      // Return a more detailed error for troubleshooting
      return {
        statusCode: 400,
        message: `Failed to create booking: ${error.message}`,
        error: error.message,
      };
    }
  }

  async findById(id: string): Promise<any> {
    try {
      this.logger.log(`Finding booking with ID: ${id}`);
      
      const booking = await this.bookingModel.findById(id).exec();
      
      if (!booking) {
        this.logger.warn(`Booking with ID ${id} not found`);
        return {
          statusCode: 404,
          message: 'Booking not found',
        };
      }
      
      this.logger.log(`Successfully retrieved booking with ID: ${id}`);
      return {
        statusCode: 200,
        message: 'Booking retrieved successfully',
        data: booking,
      };
    } catch (error) {
      this.logger.error(`Failed to find booking by ID ${id}: ${error.message}`, error.stack);
      
      return {
        statusCode: 500,
        message: `Failed to retrieve booking: ${error.message}`,
        error: error.message,
      };
    }
  }

  async findByEmail(email: string): Promise<any> {
    try {
      this.logger.log(`Finding bookings for customer email: ${email}`);
      
      const bookings = await this.bookingModel.find({
        'customer.email': email
      }).sort({ createdAt: -1 }).exec(); // Sort by newest first
      
      if (!bookings || bookings.length === 0) {
        this.logger.warn(`No bookings found for email: ${email}`);
        return {
          statusCode: 404,
          message: 'No bookings found for this email address',
        };
      }
      
      this.logger.log(`Successfully retrieved ${bookings.length} booking(s) for email: ${email}`);
      return {
        statusCode: 200,
        message: 'Bookings retrieved successfully',
        data: bookings,
      };
    } catch (error) {
      this.logger.error(`Failed to find bookings by email ${email}: ${error.message}`, error.stack);
      
      return {
        statusCode: 500,
        message: `Failed to retrieve bookings: ${error.message}`,
        error: error.message,
      };
    }
  }

  async findAll(filters: any = {}): Promise<any> {
    try {
      this.logger.log('Fetching all bookings with filters:', filters);
      
      // Create a query object based on filters
      const query = {};
      
      // Apply propertyId filter if provided
      if (filters.propertyId) {
        query['propertyId'] = filters.propertyId;
      }
      
      // Apply status filter if provided
      if (filters.status) {
        query['status'] = filters.status;
      }

      // Date range filters
      if (filters.fromDate) {
        query['checkInDate'] = { $gte: new Date(filters.fromDate) };
      }
      
      if (filters.toDate) {
        query['checkOutDate'] = { ...query['checkOutDate'] || {}, $lte: new Date(filters.toDate) };
      }
      
      // Get all bookings with the applied filters
      const bookings = await this.bookingModel.find(query).sort({ createdAt: -1 }).exec();
      
      this.logger.log(`Successfully retrieved ${bookings.length} bookings`);
      return {
        statusCode: 200,
        message: 'Bookings retrieved successfully',
        data: bookings,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch bookings: ${error.message}`, error.stack);
      
      return {
        statusCode: 500,
        message: `Failed to retrieve bookings: ${error.message}`,
        error: error.message,
      };
    }
  }

 async findByHostId(filters: any) {
  // Add more detailed logging
  this.logger.log(`findByHostId called with filters: ${JSON.stringify(filters)}`);
  
  const query: Record<string, any> = {};
  
  // Ensure hostId is properly added to the query
  if (filters.hostId) {
    query.hostId = filters.hostId;
    this.logger.log(`Filtering by hostId: ${filters.hostId}`);
  } else {
    this.logger.warn('No hostId provided in filters');
  }
  
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.status) query.status = filters.status;
  if (filters.fromDate) query.checkInDate = { $gte: new Date(filters.fromDate) };
  if (filters.toDate) query.checkOutDate = { $lte: new Date(filters.toDate) };
  
  this.logger.log(`Final query: ${JSON.stringify(query)}`);
  
  // Execute the query and return results
  const bookings = await this.bookingModel.find(query).sort({ createdAt: -1 }).exec();
  this.logger.log(`Found ${bookings.length} bookings`);
  
  return bookings;
}



async updateStatus(id: string, status: 'approved' | 'rejected'): Promise<any> {
  try {
    this.logger.log(`Updating booking ${id} status to: ${status}`);
    
    // Find the booking first to make sure it exists
    const booking = await this.bookingModel.findById(id).exec();
    
    if (!booking) {
      this.logger.warn(`Booking with ID ${id} not found for status update`);
      return {
        statusCode: 404,
        message: 'Booking not found',
      };
    }
    
    // Update the status and relevant date
    const updateData: any = { status };
    
     if (status === 'approved') {
      updateData.approvalDate = new Date();
      
      // Set payment expiration date to 48 hours (2 days) from now
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 2);
      updateData.paymentExpirationDate = expirationDate;
      
    } else if (status === 'rejected') {
      updateData.rejectionDate = new Date();
    }

    // Update the booking in the database
    const updatedBooking = await this.bookingModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true } // Return the updated document
    ).exec();
    
    if (!updatedBooking) {
      this.logger.warn(`Booking with ID ${id} was not found during update`);
      return {
        statusCode: 404,
        message: 'Booking not found during update',
      };
    }

    this.logger.log(`Successfully updated booking ${id} status to ${status}`);
    
    // Send appropriate email based on the status
    try {
      if (status === 'approved') {
        await this.emailService.sendBookingApprovedEmail(updatedBooking);
        this.logger.log(`Booking approved email sent to ${updatedBooking.customer.email}`);
      } else if (status === 'rejected') {
        await this.emailService.sendBookingRejectedEmail(updatedBooking);
        this.logger.log(`Booking rejected email sent to ${updatedBooking.customer.email}`);
      }
    } catch (emailError) {
      this.logger.error(`Failed to send status update email: ${emailError.message}`, emailError.stack);
      // We don't want the status update to fail if the email fails to send
      // Just log the error and continue
    }
    
    // Notify host service about the status change
    try {
      const notificationData = {
        bookingId: updatedBooking.id,
        hostId: updatedBooking.hostId,
        propertyId: updatedBooking.propertyId,
        status: updatedBooking.status,
        updatedAt: new Date()
      };
      
      //this.hostServiceClient.emit('booking_status_updated', notificationData);
      this.logger.log(`Host notification event emitted about booking status change`);
    } catch (notificationError) {
      this.logger.error(`Failed to notify host service: ${notificationError.message}`, notificationError.stack);
    }


    // NEW CODE: Emit booking_approved event to update property availability
    if (status === 'approved') {
      try {
        const availabilityUpdateData = {
          bookingId: updatedBooking.id,
          propertyId: updatedBooking.propertyId,
          checkInDate: updatedBooking.checkInDate,
          checkOutDate: updatedBooking.checkOutDate,
          status: updatedBooking.status
        };
        
        // Emit the event to the property service
        this.propertyServiceClient.emit('booking_approved', availabilityUpdateData);
        this.logger.log(`Property service notified about booking approval for availability update`);
      } catch (availabilityError) {
        this.logger.error(`Failed to notify property service for availability update: ${availabilityError.message}`, availabilityError.stack);
      }
    }
    
    return {
      statusCode: 200,
      message: `Booking ${status} successfully`,
      data: updatedBooking,
    };
  } catch (error) {
    this.logger.error(`Failed to update booking status: ${error.message}`, error.stack);
    
    return {
      statusCode: 500,
      message: `Failed to update booking status: ${error.message}`,
      error: error.message,
    };
  }
}



async cancelBooking(id: string): Promise<any> {
  try {
    this.logger.log(`Attempting to cancel booking ${id}`);
    
    // Find the booking first to make sure it exists and check its status
    const booking = await this.bookingModel.findById(id).exec();
    
    if (!booking) {
      this.logger.warn(`Booking with ID ${id} not found for cancellation`);
      return {
        statusCode: 404,
        message: 'Booking not found',
      };
    }
    
    // Check if booking can be canceled (only pending bookings can be canceled)
    if (booking.status !== 'pending') {
      this.logger.warn(`Booking ${id} cannot be canceled. Current status: ${booking.status}`);
      return {
        statusCode: 400,
        message: `Booking cannot be canceled. Current status is ${booking.status}. Only pending bookings can be canceled.`,
      };
    }
    
    // Update the booking status to canceled
    const updateData = {
      status: 'canceled',
      cancellationDate: new Date(),
      cancellationReason: 'Canceled by customer'
    };

    // Update the booking in the database
    const updatedBooking = await this.bookingModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true } // Return the updated document
    ).exec();
    
    if (!updatedBooking) {
      this.logger.warn(`Booking with ID ${id} was not found during cancellation`);
      return {
        statusCode: 404,
        message: 'Booking not found during cancellation',
      };
    }

    this.logger.log(`Successfully canceled booking ${id}`);
    
    // Send cancellation email
    try {
      //await this.emailService.sendBookingCanceledEmail(updatedBooking);
      this.logger.log(`Booking cancellation email sent to ${updatedBooking.customer.email}`);
    } catch (emailError) {
      this.logger.error(`Failed to send cancellation email: ${emailError.message}`, emailError.stack);
      // We don't want the cancellation to fail if the email fails to send
    }
    
    // Notify host service about the cancellation
    try {
      const notificationData = {
        bookingId: updatedBooking.id,
        hostId: updatedBooking.hostId,
        propertyId: updatedBooking.propertyId,
        status: updatedBooking.status,
        cancellationDate: updatedBooking.cancellationDate,
        updatedAt: new Date()
      };
      
      // Uncomment when ready to use
      this.hostServiceClient.emit('booking_canceled', notificationData);
      this.logger.log(`Host notification event emitted about booking cancellation`);
    } catch (notificationError) {
      this.logger.error(`Failed to notify host service: ${notificationError.message}`, notificationError.stack);
    }

    // Emit booking_canceled event to restore property availability
    try {
      const availabilityRestoreData = {
        bookingId: updatedBooking.id,
        propertyId: updatedBooking.propertyId,
        checkInDate: updatedBooking.checkInDate,
        checkOutDate: updatedBooking.checkOutDate,
        segments: updatedBooking.segments,
        status: updatedBooking.status
      };
      
      // Emit the event to the property service to restore availability
      this.propertyServiceClient.emit('booking_canceled', availabilityRestoreData);
      this.logger.log(`Property service notified about booking cancellation for availability restoration`);
    } catch (availabilityError) {
      this.logger.error(`Failed to notify property service for availability restoration: ${availabilityError.message}`, availabilityError.stack);
    }
    
    return {
      statusCode: 200,
      message: 'Booking canceled successfully',
      data: updatedBooking,
    };
  } catch (error) {
    this.logger.error(`Failed to cancel booking: ${error.message}`, error.stack);
    
    return {
      statusCode: 500,
      message: `Failed to cancel booking: ${error.message}`,
      error: error.message,
    };
  }
}



// New method to check for expired payment deadlines
async checkExpiredPayments(): Promise<void> {
  try {
    this.logger.log('Checking for expired payment deadlines');
    
    const now = new Date();
    
    // Find all approved bookings with expired payment deadlines
    const expiredBookings = await this.bookingModel.find({
      status: 'approved',
      paymentExpirationDate: { $lt: now }
    }).exec();
    
    this.logger.log(`Found ${expiredBookings.length} bookings with expired payment deadlines`);
    
    // Update each expired booking to rejected status
    for (const booking of expiredBookings) {
      if (booking.paymentMethod === 'cash' || booking.paymentMethod === 'check') {
        this.logger.log(`Skipping rejection for booking ${booking.id} with payment method: ${booking.paymentMethod}`);
        continue;
      }


      await this.bookingModel.findByIdAndUpdate(
        booking.id,
        {
          status: 'rejected',
          rejectionDate: new Date()
        }
      ).exec();
      
      this.logger.log(`Automatically rejected booking ${booking.id} due to payment expiration`);
      
      // Send rejection email
      try {
        await this.emailService.sendBookingExpiredEmail(booking);
        this.logger.log(`Payment expiration rejection email sent to ${booking.customer.email}`);
      } catch (emailError) {
        this.logger.error(`Failed to send rejection email: ${emailError.message}`, emailError.stack);
      }
      
      // Notify host service
      try {
        const notificationData = {
          bookingId: booking.id,
          hostId: booking.hostId,
          propertyId: booking.propertyId,
          status: 'rejected',
          updatedAt: new Date()
        };
        
        //this.hostServiceClient.emit('booking_status_updated', notificationData);
        this.logger.log(`Host notification event emitted about booking rejection due to payment expiration`);
      } catch (notificationError) {
        this.logger.error(`Failed to notify host service: ${notificationError.message}`, notificationError.stack);
      }

      // NEW CODE: Emit booking_rejected event to restore property availability
      try {
        const availabilityRestoreData = {
          bookingId: booking.id,
          propertyId: booking.propertyId,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          segments: booking.segments, // Include the segments to restore
          status: 'rejected',
          rejectionReason: 'payment_expired'
        };
        
        // Emit the event to the property service
        this.propertyServiceClient.emit('booking_rejected', availabilityRestoreData);
        this.logger.log(`Property service notified about booking rejection for availability restoration`);
      } catch (availabilityError) {
        this.logger.error(`Failed to notify property service for availability restoration: ${availabilityError.message}`, availabilityError.stack);
      }
    }
  } catch (error) {
    this.logger.error(`Error checking expired payments: ${error.message}`, error.stack);
  }
}


// Add method to handle offline payment confirmation
async confirmOfflinePayment(bookingId: string): Promise<any> {
  try {
    this.logger.log(`Confirming offline payment for booking ID: ${bookingId}`);

    // Find the booking by ID
    const booking = await this.bookingModel.findById(bookingId);
    
    if (!booking) {
      this.logger.error(`Booking not found with ID: ${bookingId}`);
      return {
        statusCode: 404,
        message: 'Booking not found',
        error: 'Booking not found with the provided ID',
      };
    }

    // Validate that it's an offline payment method
    if (booking.paymentMethod !== 'cash' && booking.paymentMethod !== 'check') {
      this.logger.error(`Cannot confirm non-offline payment for booking ID: ${bookingId}`);
      return {
        statusCode: 400,
        message: 'Invalid operation',
        error: 'This booking does not have an offline payment method',
      };
    }

    // Update the booking status to confirmed
    booking.status = 'confirmed';
    booking.confirmationDate = new Date();
    
    // Save the updated booking
    const updatedBooking = await booking.save();
    
    this.logger.log(`Offline payment confirmed successfully for booking ID: ${bookingId}`);

    // Send confirmation email to customer
    try {
      // Note: Email method will be implemented later
      await this.emailService.sendOfflinePaymentConfirmationEmail(updatedBooking);
      this.logger.log(`Offline payment confirmation email sent to ${updatedBooking.customer.email}`);
    } catch (emailError) {
      this.logger.error(`Failed to send confirmation email: ${emailError.message}`, emailError.stack);
      // Don't fail the confirmation if email fails
    }

    // Notify host about confirmed booking
    try {
      const confirmationNotificationData = {
        bookingId: updatedBooking.id,
        hostId: updatedBooking.hostId,
        propertyId: updatedBooking.propertyId,
        status: 'confirmed',
        updatedAt: new Date(),
        paymentMethod: updatedBooking.paymentMethod
      };

      // Emit event to host service
      //this.hostServiceClient.emit('confirmed_offline_payment_booking', confirmationNotificationData);
      this.logger.log(`Booking confirmation notification sent to host: ${updatedBooking.hostId}`);
    } catch (notificationError) {
      this.logger.error(`Failed to notify host about booking confirmation: ${notificationError.message}`, notificationError.stack);
      // Don't fail the confirmation if notification fails
    }
    
    return {
      statusCode: 200,
      message: 'Offline payment confirmed successfully',
      data: updatedBooking,
    };
  } catch (error) {
    this.logger.error(`Failed to confirm offline payment: ${error.message}`, error.stack);
    
    return {
      statusCode: 500,
      message: `Failed to confirm offline payment: ${error.message}`,
      error: error.message,
    };
  }
}

// Add method to update booking payment method
  async updatePaymentMethod(bookingId: string, paymentMethod: string): Promise<any> {
    try {
      this.logger.log(`Updating payment method for booking ID: ${bookingId} to ${paymentMethod}`);

      // Find the booking by ID
      const booking = await this.bookingModel.findById(bookingId);
      
      if (!booking) {
        this.logger.error(`Booking not found with ID: ${bookingId}`);
        return {
          statusCode: 404,
          message: 'Booking not found',
          error: 'Booking not found with the provided ID',
        };
      }

      // Update the payment method
      booking.paymentMethod = paymentMethod;
      

      // For offline payments (cash or check), automatically confirm the booking
      if (paymentMethod === 'cash' || paymentMethod === 'check') {
        booking.status = 'confirmed';
        booking.confirmationDate = new Date();
        this.logger.log(`Automatically confirming booking with offline payment method: ${paymentMethod}`);
      }

      // Set payment expiration date (48 hours) for online payments
      if (paymentMethod === 'credit card' || paymentMethod === 'debit card') {
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 2);
        booking.paymentExpirationDate = expirationDate;
      }

      // Save the updated booking
      const updatedBooking = await booking.save();
      
      this.logger.log(`Payment method updated successfully for booking ID: ${bookingId}`);


      // For offline payments, send confirmation email
      if (paymentMethod === 'cash' || paymentMethod === 'check') {
        try {
          // Note: Email method will be implemented later
          await this.emailService.sendOfflinePaymentConfirmationEmail(updatedBooking);
          this.logger.log(`Offline payment confirmation email sent to ${updatedBooking.customer.email}`);
        } catch (emailError) {
          this.logger.error(`Failed to send confirmation email: ${emailError.message}`, emailError.stack);
          // Don't fail the update if email fails
        }
      }

      // Notify host about payment method selection
      try {
        const paymentNotificationData = {
          bookingId: updatedBooking.id,
          hostId: updatedBooking.hostId,
          paymentMethod: updatedBooking.paymentMethod,
          isOfflinePayment: paymentMethod === 'cash' || paymentMethod === 'check',
          status: updatedBooking.status
        };

        // Emit event to host service
        //this.hostServiceClient.emit('booking_payment_method_updated', paymentNotificationData);
        this.logger.log(`Payment method update notification sent to host: ${updatedBooking.hostId}`);
      } catch (notificationError) {
        this.logger.error(`Failed to notify host about payment method update: ${notificationError.message}`, notificationError.stack);
        // Don't fail the update if notification fails
      }
      
      return {
        statusCode: 200,
        message: 'Payment method updated successfully',
        data: updatedBooking,
      };
    } catch (error) {
      this.logger.error(`Failed to update payment method: ${error.message}`, error.stack);
      
      return {
        statusCode: 500,
        message: `Failed to update payment method: ${error.message}`,
        error: error.message,
      };
    }
  }

  async update(bookingId: string, updateBookingDto: Partial<CreateBookingDto>): Promise<any> {
    try {
      this.logger.log(`Updating booking with ID: ${bookingId}`);
      
      // First, find the existing booking
      const existingBooking = await this.bookingModel.findById(bookingId);
      
      if (!existingBooking) {
        throw new Error('Booking not found');
      }

      // Log the update request for debugging
      this.logger.log(`Update data received: ${JSON.stringify(updateBookingDto)}`);

      // Validate segments if provided
      if (updateBookingDto.segments) {
        this.logger.log(`Segments for update: ${JSON.stringify(updateBookingDto.segments)}`);
        this.logger.log(`Segments type: ${typeof updateBookingDto.segments}`);
        this.logger.log(`Is segments array: ${Array.isArray(updateBookingDto.segments)}`);
        this.logger.log(`Segments length: ${updateBookingDto.segments?.length}`);

        if (!Array.isArray(updateBookingDto.segments) || updateBookingDto.segments.length === 0) {
          throw new Error('Booking segments must be a non-empty array');
        }
      }

      // Build the update object with only provided fields
      const updateData: any = {};

      // Update basic fields if provided
      if (updateBookingDto.propertyId) updateData.propertyId = updateBookingDto.propertyId;
      if (updateBookingDto.hostId) updateData.hostId = updateBookingDto.hostId;
      if (updateBookingDto.checkInDate) updateData.checkInDate = updateBookingDto.checkInDate;
      if (updateBookingDto.checkOutDate) updateData.checkOutDate = updateBookingDto.checkOutDate;
      if (updateBookingDto.nights) updateData.nights = updateBookingDto.nights;
      if (updateBookingDto.status) updateData.status = updateBookingDto.status;

      // Update nested objects if provided
      if (updateBookingDto.guests) {
        updateData.guests = {
          adults: updateBookingDto.guests.adults,
          children: updateBookingDto.guests.children || 0,
          infants: updateBookingDto.guests.infants || 0,
        };
      }

      if (updateBookingDto.segments) {
        updateData.segments = updateBookingDto.segments.map(segment => ({
          start_time: segment.start_time,
          end_time: segment.end_time,
          price: segment.price,
          otherPlatformPrice: segment.otherPlatformPrice,
          isPrice: segment.isPrice,
          touristTax: segment.touristTax,
        }));
      }

      if (updateBookingDto.pricing) {
        updateData.pricing = {
          total: updateBookingDto.pricing.total,
          subtotal: updateBookingDto.pricing.subtotal,
          taxAmount: updateBookingDto.pricing.taxAmount,
          serviceCharge: updateBookingDto.pricing.serviceCharge,
        };
      }

      if (updateBookingDto.customer) {
        updateData.customer = {
          fullName: updateBookingDto.customer.fullName || existingBooking.customer.fullName,
          email: updateBookingDto.customer.email || existingBooking.customer.email,
          phone: updateBookingDto.customer.phone || existingBooking.customer.phone,
          message: updateBookingDto.customer.message !== undefined ? updateBookingDto.customer.message : existingBooking.customer.message,
          additionalMessage: updateBookingDto.customer.additionalMessage !== undefined ? updateBookingDto.customer.additionalMessage : existingBooking.customer.additionalMessage,
        };
      }

      // Add updatedAt timestamp
      updateData.updatedAt = new Date();

      // Log what will be updated
      this.logger.log(`Update data to apply: ${JSON.stringify(updateData)}`);

      // Perform the update
      const updatedBooking = await this.bookingModel.findByIdAndUpdate(
        bookingId,
        { $set: updateData },
        { 
          new: true, // Return the updated document
          runValidators: true // Run schema validations
        }
      );

      if (!updatedBooking) {
        throw new Error('Failed to update booking');
      }

      this.logger.log(`Booking updated successfully with ID: ${updatedBooking.id}`);

      // Send update confirmation email if customer email was provided
      try {
        if (updateBookingDto.customer?.email || existingBooking.customer.email) {
          //await this.emailService.sendBookingUpdateEmail(updatedBooking);
          this.logger.log(`Update confirmation email sent to ${updatedBooking.customer.email}`);
        }
      } catch (emailError) {
        this.logger.error(`Failed to send update confirmation email: ${emailError.message}`, emailError.stack);
        // Don't fail the update if email fails
      }

      // Notify host about booking update if significant changes were made
      try {
        const significantFields = ['checkInDate', 'checkOutDate', 'guests', 'status'];
        const hasSignificantChanges = significantFields.some(field => updateBookingDto[field] !== undefined);
        
        if (hasSignificantChanges) {
          const hostNotificationData = {
            bookingId: updatedBooking.id,
            hostId: updatedBooking.hostId,
            propertyId: updatedBooking.propertyId,
            checkInDate: updatedBooking.checkInDate,
            checkOutDate: updatedBooking.checkOutDate,
            guests: updatedBooking.guests,
            updateType: 'booking_updated',
          };
          
          //this.hostServiceClient.emit('booking_updated', hostNotificationData);
          this.logger.log(`Host notification event emitted for booking update: ${updatedBooking.hostId}`);
        }
      } catch (notificationError) {
        this.logger.error(`Failed to notify host about update: ${notificationError.message}`, notificationError.stack);
        // Don't fail the update if notification fails
      }

      return {
        statusCode: 200,
        message: 'Booking updated successfully',
        data: updatedBooking,
      };

    } catch (error) {
      this.logger.error(`Failed to update booking: ${error.message}`, error.stack);
      
      return {
        statusCode: 400,
        message: `Failed to update booking: ${error.message}`,
        error: error.message,
      };
    }
  }

  // Add this method to your BookingService class
  async confirmBookingPayment(paymentData: any): Promise<any> {
    try {
      this.logger.log(`Processing booking payment confirmation for booking: ${paymentData.bookingId}`);
      
      // Find the booking
      const booking = await this.bookingModel.findById(paymentData.bookingId).exec();
      
      if (!booking) {
        this.logger.warn(`Booking with ID ${paymentData.bookingId} not found for payment confirmation`);
        return {
          statusCode: 404,
          message: 'Booking not found',
        };
      }

      // Check if booking is in a valid state for payment confirmation
      if (!['pending', 'approved'].includes(booking.status)) {
        this.logger.warn(`Booking ${paymentData.bookingId} cannot be confirmed. Current status: ${booking.status}`);
        return {
          statusCode: 400,
          message: `Booking cannot be confirmed from status: ${booking.status}`,
        };
      }

      // Update booking to confirmed status
      const updateData = {
        status: 'confirmed',
        confirmationDate: new Date(),
        paymentMethod: paymentData.billingDetails?.paymentMethod || 'card'
      };

      // Update the booking in the database
      const updatedBooking = await this.bookingModel.findByIdAndUpdate(
        paymentData.bookingId,
        updateData,
        { new: true } // Return the updated document
      ).exec();

      if (!updatedBooking) {
        this.logger.warn(`Booking with ID ${paymentData.bookingId} was not found during confirmation update`);
        return {
          statusCode: 404,
          message: 'Booking not found during confirmation update',
        };
      }

      this.logger.log(`Successfully confirmed booking ${paymentData.bookingId} with payment`);

      // Prepare booking confirmation data with billing details
      const confirmationData = {
        booking: updatedBooking,
        payment: {
          paymentId: paymentData.paymentId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          plan: paymentData.plan,
          platformFeeAmount: paymentData.platformFeeAmount,
          hostAmount: paymentData.hostAmount,
          paidAt: paymentData.paidAt,
          stripePaymentIntentId: paymentData.stripePaymentIntentId,
        },
        billingDetails: paymentData.billingDetails,
        invoice: {
          invoiceNumber: `INV-${updatedBooking.id.toString().slice(-8).toUpperCase()}`,
          issueDate: new Date(),
          dueDate: new Date(), // Paid immediately
          customerName: paymentData.billingDetails?.customerName || updatedBooking.customer.fullName,
          customerEmail: paymentData.billingDetails?.customerEmail || updatedBooking.customer.email,
          lineItems: [
            {
              description: `${updatedBooking.nights} night(s) accommodation`,
              checkIn: updatedBooking.checkInDate,
              checkOut: updatedBooking.checkOutDate,
              subtotal: updatedBooking.pricing.subtotal,
              taxes: updatedBooking.pricing.taxAmount,
              serviceCharge: updatedBooking.pricing.serviceCharge,
              total: updatedBooking.pricing.total
            }
          ],
          paymentDetails: {
            method: paymentData.billingDetails?.paymentMethod || 'card',
            transactionId: paymentData.stripePaymentIntentId,
            receiptUrl: paymentData.billingDetails?.receiptUrl
          }
        }
      };

      // Send booking confirmation email with billing details and invoice
      try {
        await this.emailService.sendBookingConfirmationWithInvoice(confirmationData);
        this.logger.log(`Booking confirmation email with invoice sent to ${updatedBooking.customer.email}`);
      } catch (emailError) {
        this.logger.error(`Failed to send confirmation email with invoice: ${emailError.message}`, emailError.stack);
        // Don't fail the payment confirmation if email fails
      }

      // Notify host service about the confirmed booking
      try {
        const hostNotificationData = {
          bookingId: updatedBooking._id,
          hostId: updatedBooking.hostId,
          propertyId: updatedBooking.propertyId,
          status: updatedBooking.status,
          confirmedAt: updatedBooking.confirmationDate,
          paymentAmount: paymentData.hostAmount,
          guestDetails: updatedBooking.customer
        };
        
        //this.hostServiceClient.emit('booking_confirmed', hostNotificationData);
        this.logger.log(`Host notification sent for confirmed booking`);
      } catch (notificationError) {
        this.logger.error(`Failed to notify host service: ${notificationError.message}`, notificationError.stack);
      }

      // Emit booking_confirmed event to update property availability (if not already done)
      try {
        const availabilityUpdateData = {
          bookingId: updatedBooking._id,
          propertyId: updatedBooking.propertyId,
          checkInDate: updatedBooking.checkInDate,
          checkOutDate: updatedBooking.checkOutDate,
          segments: updatedBooking.segments,
          status: updatedBooking.status
        };
        
        this.propertyServiceClient.emit('booking_confirmed', availabilityUpdateData);
        this.logger.log(`Property service notified about confirmed booking for availability update`);
      } catch (availabilityError) {
        this.logger.error(`Failed to notify property service: ${availabilityError.message}`, availabilityError.stack);
      }

      return {
        statusCode: 200,
        message: 'Booking confirmed successfully with payment',
        data: {
          booking: updatedBooking,
          payment: confirmationData.payment,
          invoice: confirmationData.invoice
        },
      };

    } catch (error) {
      this.logger.error(`Failed to confirm booking payment: ${error.message}`, error.stack);
      
      return {
        statusCode: 500,
        message: `Failed to confirm booking payment: ${error.message}`,
        error: error.message,
      };
    }
  }
}