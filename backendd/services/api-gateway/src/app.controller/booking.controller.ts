import { Controller, Get, Post, Patch, Body, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom, lastValueFrom } from 'rxjs';

@Controller('bookings')
export class BookingController {

  private readonly logger = new Logger(BookingController.name);  

  constructor(
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  @Post()
  async create(@Body() createBookingDto: any) {
    try {
      // Always set status to pending for new bookings
      createBookingDto.status = 'pending';
      
      console.log('Sending booking request to microservice:', createBookingDto);
      
      const result = await firstValueFrom(
        this.bookingClient.send('create_booking', createBookingDto)
      );
      
      console.log('Response from booking service:', result);
      
      if (result.statusCode !== 201) {
        throw new HttpException(
          result.message || 'Failed to create booking', 
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }
      
      return result.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw new HttpException(
        error.message || 'Failed to create booking', 
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }





  @Get()
  async findAll(@Query() query: any) {
    this.logger.log(`Received GET /bookings request with query: ${JSON.stringify(query)}`);
    try {
      const filters = {
        propertyId: query.propertyId,
        status: query.status,
        fromDate: query.fromDate,
        toDate: query.toDate
      };

      // Forward request to booking service
      const response = await firstValueFrom(
        this.bookingClient.send('find_all_bookings', filters)
      );

      if (response.statusCode !== 200) {
        throw new HttpException(
          {
            message: response.message || 'Error retrieving bookings',
            error: response.error || 'Unknown error'
          },
          response.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return response;
    } catch (error) {
      this.logger.error(`Error retrieving bookings: ${error.message}`, error.stack);
      throw new HttpException(
        {
          message: 'Failed to retrieve bookings',
          error: error.message
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    try {
      this.logger.log(`Received GET /bookings/by-email/${email} request`);
     
      // Validate email format (basic validation)
      if (!email || !email.includes('@')) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }

      const result = await firstValueFrom(
        this.bookingClient.send('find_bookings_by_email', email)
      );
   
      console.log('Response from booking service:', result);
     
      if (result.statusCode === 404) {
        throw new HttpException('No bookings found for this email address', HttpStatus.NOT_FOUND);
      }
     
      if (result.statusCode !== 200) {
        throw new HttpException(
          result.message || 'Failed to retrieve bookings',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }
     
      return {
        message: result.message,
        data: result.data,
        count: result.data.length
      };
    } catch (error) {
      console.error('Error fetching bookings by email:', error);
      throw new HttpException(
        error.message || 'Failed to retrieve bookings by email',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  @Get(':id')
  async findById(@Param('id') id: string) {
    try {
      this.logger.log(`Received GET /bookings/${id} request`);
      
      const result = await firstValueFrom(
        this.bookingClient.send('find_booking_by_id', id)
      );
    
      console.log('Response from booking service:', result);
      if (!result.data) {
        throw new HttpException('Booking data not found', HttpStatus.NOT_FOUND);
      }
      
      if (result.statusCode === 404) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }
      
      if (result.statusCode !== 200) {
        throw new HttpException(
          result.message || 'Failed to retrieve booking details', 
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }
      
      return {data: result.data };
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw new HttpException(
        error.message || 'Failed to retrieve booking details', 
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  // Add endpoint to update payment method
  @Patch(':id/payment-method')
  async updatePaymentMethod(@Param('id') id: string, @Body() body: { paymentMethod: string }) {
    try {
      this.logger.log(`Updating payment method for booking ${id} to ${body.paymentMethod}`);
      
      if (!body.paymentMethod) {
        throw new HttpException(
          'Payment method is required',
          HttpStatus.BAD_REQUEST
        );
      }
      
      const payload = {
        bookingId: id,
        paymentMethod: body.paymentMethod
      };
      
      const result = await firstValueFrom(
        this.bookingClient.send('update_booking_payment_method', payload)
      );
      
      if (result.statusCode !== 200) {
        throw new HttpException(
          result.message || 'Failed to update payment method',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }
      
      return result.data;
    } catch (error) {
      this.logger.error(`Error updating payment method: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to update payment method',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Add endpoint to confirm offline payment
  @Patch(':id/confirm-offline-payment')
  async confirmOfflinePayment(@Param('id') id: string) {
    try {
      this.logger.log(`Confirming offline payment for booking ${id}`);
      
      const payload = {
        bookingId: id
      };
      
      const result = await firstValueFrom(
        this.bookingClient.send('confirm_offline_payment', payload)
      );
      
      if (result.statusCode !== 200) {
        throw new HttpException(
          result.message || 'Failed to confirm offline payment',
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }
      
      return result.data;
    } catch (error) {
      this.logger.error(`Error confirming offline payment: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to confirm offline payment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  @Get('host/:hostId')
async findBookingsByHost(@Param('hostId') hostId: string, @Query() query: any) {
  this.logger.log(`Received GET /bookings/host/${hostId} request with query: ${JSON.stringify(query)}`);
  try {
    // Validate hostId
    if (!hostId || hostId.trim() === '') {
      throw new HttpException(
        {
          message: 'Invalid host ID',
          error: 'Bad Request'
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const filters = {
      hostId: hostId.trim(),
      status: query.status,
      fromDate: query.fromDate,
      toDate: query.toDate,
      propertyId: query.propertyId // Optional property filter
    };
    
    this.logger.log(`Sending filters to microservice: ${JSON.stringify(filters)}`);
    
    // Forward request to booking service
    const response = await firstValueFrom(
      this.bookingClient.send('find_host_bookings', filters)
    );
    
    this.logger.log(`Received response from microservice: ${JSON.stringify({
      statusCode: response.statusCode,
      message: response.message,
      dataCount: response.data ? response.data.length : 0
    })}`);
    
    if (response.statusCode !== 200) {
      throw new HttpException(
        {
          message: response.message || 'Error retrieving host bookings',
          error: response.error || 'Unknown error'
        },
        response.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    
    return response;
  } catch (error) {
    this.logger.error(`Error retrieving host bookings: ${error.message}`, error.stack);
    throw new HttpException(
      {
        message: 'Failed to retrieve host bookings',
        error: error.message
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

@Patch(':id/status')
  async updateBookingStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: { status: 'approved' | 'rejected' }
  ) {
    this.logger.log(`API Gateway: Updating booking ${id} status to ${updateStatusDto.status}`);

    if (!updateStatusDto.status || !['approved', 'rejected'].includes(updateStatusDto.status)) {
      throw new HttpException('Status must be either "approved" or "rejected"', HttpStatus.BAD_REQUEST);
    }

    try {
      // Send message to booking microservice to update status
      const response = await lastValueFrom(
        this.bookingClient.send('update_booking_status', {
          id,
          status: updateStatusDto.status
        })
      );

      // Check if the response indicates an error
      if (response.statusCode !== 200) {
        throw new HttpException(
          response.message || 'Failed to update booking status',
          response.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return {
        success: true,
        message: `Booking ${updateStatusDto.status} successfully`,
        data: response.data
      };
    } catch (error) {
      this.logger.error(`Error updating booking status: ${error.message}`, error.stack);
      
      // Check if error is already an HttpException
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to update booking status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }




  @Patch(':id/cancel')
  async cancelBooking(@Param('id') id: string) {
    this.logger.log(`API Gateway: Canceling booking ${id}`);
    
    if (!id) {
      throw new HttpException('Booking ID is required', HttpStatus.BAD_REQUEST);
    }
    
    try {
      // Send message to booking microservice to cancel booking
      const response = await lastValueFrom(
        this.bookingClient.send('cancel_booking', { id })
      );
      
      // Check if the response indicates an error
      if (response.statusCode !== 200) {
        throw new HttpException(
          response.message || 'Failed to cancel booking',
          response.statusCode || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      return {
        success: true,
        message: 'Booking canceled successfully',
        data: response.data
      };
    } catch (error) {
      this.logger.error(`Error canceling booking: ${error.message}`, error.stack);
      
      // Check if error is already an HttpException
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to cancel booking: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBookingDto: any) {
    try {
      this.logger.log(`Received update request for booking ID: ${id}`);
      this.logger.log(`Update data: ${JSON.stringify(updateBookingDto)}`);
      
      // Validate that ID is provided
      if (!id) {
        throw new HttpException('Booking ID is required', HttpStatus.BAD_REQUEST);
      }

      // Prepare payload for microservice
      const payload = {
        id: id,
        updateData: updateBookingDto
      };
      
      console.log('Sending booking update request to microservice:', payload);
      
      const result = await firstValueFrom(
        this.bookingClient.send('update_booking', payload)
      );
      
      console.log('Response from booking service:', result);
      
      if (result.statusCode !== 200) {
        throw new HttpException(
          result.message || 'Failed to update booking', 
          result.statusCode || HttpStatus.BAD_REQUEST
        );
      }
      
      return result.data;
    } catch (error) {
      console.error('Error updating booking:', error);
      
      // If it's already an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Otherwise, create a new HttpException
      throw new HttpException(
        error.message || 'Failed to update booking', 
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}