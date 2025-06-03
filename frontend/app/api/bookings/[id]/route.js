// app/api/bookings/[id]/route.js
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const id = params.id;
  
  try {
    // For testing purposes, we'll return mock data
    // In a real app, you'd fetch this from your API
    // const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
    // const response = await fetch(`${apiUrl}/bookings/${id}`);
    
    // Mock data for testing
    const mockBooking = {
      id: id,
      propertyId: "PROP" + Math.floor(1000 + Math.random() * 9000),
      checkInDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      checkOutDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      nights: 7,
      guests: {
        adults: 2,
        children: 1,
        infants: 0
      },
      customer: {
        fullName: "John Doe",
        email: "john.doe@example.com",
        phone: "+1234567890"
      },
      pricing: {
        subtotal: 840.00,
        serviceCharge: 120.00,
        taxAmount: 84.00,
        total: 1044.00
      },
      status: "APPROVED"
    };

    return NextResponse.json({ 
      data: mockBooking,
      statusCode: 200,
      message: "Booking retrieved successfully" 
    });
    
    // If fetching from real API:
    // if (!response.ok) {
    //   return NextResponse.json(
    //     { error: 'Failed to fetch booking data' },
    //     { status: response.status }
    //   );
    // }
    // 
    // const data = await response.json();
    // return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}