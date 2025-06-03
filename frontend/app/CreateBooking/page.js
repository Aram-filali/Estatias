"use client";
import React, { useState, useEffect } from 'react';
import styles from '../../styles/createBooking.module.css';
import Sidebar from '../../src/components/CreateBooking/SideBar';
import BookingSteps from '../../src/components/CreateBooking/BookingSteps';
import DateSelector from '../../src/components/CreateBooking/DateSelector';
import GuestSelector from '../../src/components/CreateBooking/GuestSelector';
import ErrorPopup from '../../src/components/CreateBooking/Popup';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseISO, format, differenceInDays, addDays } from 'date-fns';
import LoadingSpinner from '@/src/components/MyWebsite/loadingSpinner';

export default function BookingInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get all URL parameters
  const propertyId = searchParams.get('propertyId');
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const adultsParam = searchParams.get('adults') || '1';
  const childrenParam = searchParams.get('children') || '0';
  const infantsParam = searchParams.get('infants') || '0';
  const totalPriceParam = searchParams.get('totalPrice') || '0';
  
  // Get pricing breakdown parameters
  const subtotalParam = searchParams.get('subtotal') || '0';
  const nightlyRateParam = searchParams.get('nightlyRate') || '0';
  const touristTaxParam = searchParams.get('touristTax') || '0';
  const serviceFeeParam = searchParams.get('serviceFee') || '0';
  const nightsParam = searchParams.get('nights') || '0';

  // Core state management
  const [activeStep, setActiveStep] = useState(1);
 
  // Personal information state
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [hostMessage, setHostMessage] = useState('');
  
  // Property data state
  const [property, setProperty] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Popup states
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [showGuestsPopup, setShowGuestsPopup] = useState(false);
  const [currentCalendarTab, setCurrentCalendarTab] = useState('dates'); // 'dates' or 'travelers'
  
  // Initialize dates from URL params
  const [selectedDates, setSelectedDates] = useState({ 
    start: checkIn, 
    end: checkOut 
  });
  
  // Initialize guests from URL params
  const [guests, setGuests] = useState({
    adults: parseInt(adultsParam, 10),
    children: parseInt(childrenParam, 10),
    infants: parseInt(infantsParam, 10)
  });
  
  // Use URL parameters for pricing if available
  const [pricing, setPricing] = useState({
    nightlyRates: [],
    subtotal: parseFloat(subtotalParam),
    taxAmount: parseFloat(touristTaxParam),
    serviceCharge: parseFloat(serviceFeeParam),
    total: parseFloat(totalPriceParam) || 0
  });
  
  // Store nights from URL param
  const [nights, setNights] = useState(parseInt(nightsParam, 10) || 0);
  
  // Add segments state for booking submission
  const [bookingSegments, setBookingSegments] = useState([]);
  
  const [isPersonalInfoComplete, setIsPersonalInfoComplete] = useState(false);
  const [isHostMessageWritten, setIsHostMessageWritten] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  

  // Add submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  

  // Fetch property data
  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!propertyId) {
        setError("No property ID provided");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // In a real app, this would be an environment variable or config
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const response = await fetch(`${baseUrl}/properties/${propertyId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data) {
          throw new Error("No data received");
        }
        
        setProperty(data);
        
        // Ensure availabilities are properly formatted and sorted
        const formattedAvailabilities = (data.availabilities || [])
          .map(avail => ({
            ...avail,
            start_time: avail.start_time.split('T')[0],
            end_time: avail.end_time.split('T')[0]
          }))
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        
        setAvailabilities(formattedAvailabilities);
        
        // Only set default dates if not already provided via URL params
        if ((!selectedDates.start || !selectedDates.end) && formattedAvailabilities.length > 0) {
          const firstAvail = formattedAvailabilities[0];
          const startDate = parseISO(firstAvail.start_time);
          // Set end date to min nights from the property or default to 5 days if not specified
          const minNights = data.minNight || 1;
          const endDate = addDays(startDate, minNights);
          
          // Make sure end date doesn't exceed availability end
          const availEnd = parseISO(firstAvail.end_time);
          const finalEndDate = endDate > availEnd ? availEnd : endDate;
          
          setSelectedDates({
            start: format(startDate, 'yyyy-MM-dd'),
            end: format(finalEndDate, 'yyyy-MM-dd')
          });
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyData();
  }, [propertyId, selectedDates.start, selectedDates.end]);
  
  // Calculate nights whenever dates change or from URL param
  useEffect(() => {
    if (nightsParam && parseInt(nightsParam, 10) > 0) {
      setNights(parseInt(nightsParam, 10));
    } else if (selectedDates.start && selectedDates.end) {
      const start = new Date(selectedDates.start);
      const end = new Date(selectedDates.end);
      setNights(differenceInDays(end, start));
    } else {
      setNights(0);
    }
  }, [selectedDates, nightsParam]);
  
  // Calculate pricing only when needed (if not provided via URL)
  useEffect(() => {
    // Skip calculation if pricing details were provided via URL params
    if (
      parseFloat(totalPriceParam) > 0 && 
      parseFloat(subtotalParam) > 0 && 
      parseFloat(nightlyRateParam) > 0
    ) {
      return;
    }
    
    if (!selectedDates.start || !selectedDates.end || !availabilities.length) {
      setPricing({
        nightlyRates: [],
        subtotal: 0,
        taxAmount: 0,
        serviceCharge: 0,
        total: 0
      });
      return;
    }
    
    const start = parseISO(selectedDates.start);
    const end = parseISO(selectedDates.end);
    const nights = eachDayOfInterval({ start, end: addDays(end, -1) }); // Exclude checkout day
    
    const nightlyRates = [];
    const segments = [];
    let subtotal = 0;
    let taxAmount = 0;
    
    // Calculate price for each night
    nights.forEach(night => {
      const availability = findAvailabilityForDate(night);
      
      if (availability) {
        const dateStr = format(night, 'yyyy-MM-dd');
        const nextDay = addDays(night, 1);
        const nextDateStr = format(nextDay, 'yyyy-MM-dd');
        
        nightlyRates.push({
          date: dateStr,
          price: availability.price,
          otherPlatformPrice: availability.otherPlatformPrice,
          isPrice: availability.isPrice,
          taxRate: availability.touristTax
        });
        
        // Create segment for this night
        segments.push({
          start_time: dateStr,
          end_time: nextDateStr,
          price: availability.price,
          otherPlatformPrice: availability.otherPlatformPrice || 0,
          isPrice: availability.isPrice || true,
          touristTax: availability.touristTax
        });
        
        subtotal += availability.price;
        taxAmount += availability.price * (availability.touristTax / 100);
      }
    });
    
    // Add service charge (5%)
    const serviceCharge = subtotal * 0.05;
    
    setPricing({
      nightlyRates,
      subtotal,
      taxAmount,
      serviceCharge,
      total: subtotal + taxAmount + serviceCharge
    });
    setBookingSegments(segments);
  }, [selectedDates, availabilities, totalPriceParam, subtotalParam, nightlyRateParam]);
  

  // Add this useEffect to ensure segments are always generated
  useEffect(() => {
    // Generate segments whenever we have the necessary data
    if (selectedDates.start && selectedDates.end && availabilities.length > 0) {
      generateBookingSegments();
    }
  }, [selectedDates, availabilities]);

  // Generate booking segments from existing data when pricing is provided via URL
  const generateBookingSegments = () => {
    if (!selectedDates.start || !selectedDates.end || !availabilities.length) {
      setBookingSegments([]);
      return;
    }
    
    const start = parseISO(selectedDates.start);
    const end = parseISO(selectedDates.end);
    const nights = eachDayOfInterval({ start, end: addDays(end, -1) });
    
    const segments = nights.map(night => {
      const availability = findAvailabilityForDate(night);
      const dateStr = format(night, 'yyyy-MM-dd');
      const nextDay = addDays(night, 1);
      const nextDateStr = format(nextDay, 'yyyy-MM-dd');
      
      return {
        start_time: dateStr,
        end_time: nextDateStr,
        price: availability?.price || 0,
        otherPlatformPrice: availability?.otherPlatformPrice || 0,
        isPrice: availability?.isPrice || true,
        touristTax: availability?.touristTax || 5
      };
    });
    
    setBookingSegments(segments);
    console.log('Generated booking segments:', segments);
  };


  // Helper functions from BookingComponent
  function eachDayOfInterval({ start, end }) {
    const days = [];
    let currentDay = new Date(start);
    
    while (currentDay <= end) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }
  
  function isWithinInterval(date, interval) {
    return date >= interval.start && date <= interval.end;
  }
  
  function findAvailabilityForDate(date) {
    if (!availabilities.length) return null;
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    // Create a new date object to avoid mutation and set to noon to avoid timezone issues
    const normalizedDate = new Date(dateObj);
    normalizedDate.setHours(12, 0, 0, 0);
    
    // Convert availabilities to date range objects
    const availabilityRanges = availabilities.map(avail => ({
      start: parseISO(avail.start_time),
      end: parseISO(avail.end_time),
      price: avail.price,
      touristTax: avail.touristTax || 5 // Default to 5% if not specified
    }));
    
    return availabilityRanges.find(range => 
      isWithinInterval(normalizedDate, { start: range.start, end: range.end })
    );
  }

  // Validate current step before proceeding to the next step
  const validateCurrentStep = () => {
    switch(activeStep) {
       case 1:
        return isPersonalInfoComplete;
      case 3:
        return isHostMessageWritten && termsAccepted; // Ensure terms are accepted before proceeding
      default:
        return true;
    }
  };

  // Handle step toggle
  const handleStepToggle = (stepNumber) => {
    if (stepNumber === activeStep) {
      return;
    }
  
    if (stepNumber < activeStep) {
      // Always allow returning to a previous step without strict validation
      setActiveStep(stepNumber);
    } else if (stepNumber > activeStep) {
      // Validation only if moving to the next step
      if (validateCurrentStep()) {
        setActiveStep(stepNumber);
      } else {
        console.log("Conditions not met, unable to move to the next step");
      }
    }
  };

  // Handle next step button
  const handleNextStep = () => {
    if (validateCurrentStep() && activeStep < 3) {
      setActiveStep(activeStep + 1);
    }
  };

  // Calculate number of nights from URL param or from dates
  const calculateNights = () => {
    if (nightsParam && parseInt(nightsParam, 10) > 0) {
      return parseInt(nightsParam, 10);
    }
    
    if (!selectedDates.start || !selectedDates.end) return 0;
    
    const start = new Date(selectedDates.start);
    const end = new Date(selectedDates.end);
    return differenceInDays(end, start);
  };

  // Handle date popup display
  const toggleDatePopup = (show) => {
    setShowDatePopup(show);
    if (show) {
      setCurrentCalendarTab('dates');
    }
  };

  // Handle guests popup display
  const toggleGuestsPopup = (show) => {
    setShowGuestsPopup(show);
    if (show) {
      setCurrentCalendarTab('travelers');
    }
  };

  // Switch tabs in popup
  const handleTabChange = (tab) => {
    setCurrentCalendarTab(tab);
  };



  // Handle form submission to backend
// Handle form submission to backend
const handleSubmitBooking = async () => {
  // Reset states
  setIsSubmitting(true);
  setSubmissionError(null);
  setSubmissionSuccess(false);
  
  try {

     // Debug: Log the segments before submission
    console.log('Booking segments before submission:', bookingSegments);
    console.log('Booking segments length:', bookingSegments.length);
    
    if (!bookingSegments || bookingSegments.length === 0) {
      console.error('No booking segments available - regenerating...');
      generateBookingSegments();
      
      // Wait a moment for state to update
      setTimeout(() => {
        console.log('Segments after regeneration:', bookingSegments);
      }, 100);
      
      if (!bookingSegments || bookingSegments.length === 0) {
        throw new Error('Unable to generate booking segments. Please try again.');
      }
    }

    // ✅ Get host ID from env
    const hostId = process.env.NEXT_PUBLIC_HOST_ID;
    console.log("Using hostId:", hostId);

    if (!hostId) {
      console.error("Host ID not found in environment variables");
      setLoading(false);
      return;
    }

    // Create the minimal booking object with only the required fields
    const bookingData = {
      propertyId,
      hostId,
      checkInDate: selectedDates.start,
      checkOutDate: selectedDates.end,
      nights,
      segments: bookingSegments,
      guests: {
        adults: guests.adults,
        children: guests.children || 0,
        infants: guests.infants || 0
      },
      pricing: {
        total: pricing.total,
        subtotal: pricing.subtotal,
        taxAmount: pricing.taxAmount,
        serviceCharge: pricing.serviceCharge
      },
      customer: {
        fullName: personalInfo.fullName,
        email: personalInfo.email,
        phone: personalInfo.phone,
        message: personalInfo.message || '',
        additionalMessage: hostMessage || ''
      }
      // Status will be set to 'pending' on the server side
    };
    
    console.log('Sending booking request:', bookingData);
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    
    const response = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData),
    });
    
    // Parse the response
    const responseData = await response.json();
    
    // Log the full response for debugging
    console.log('Full API response:', responseData);
    
    if (!response.ok) {
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }
    
    console.log('Booking successful:', responseData);
    
    // Extract booking ID from the response data with careful checking
    let bookingId;
    
    // Check all possible locations where the ID might be
    if (responseData && responseData.data && responseData.data._id) {
      bookingId = responseData.data._id;
    } else if (responseData && responseData._id) {
      bookingId = responseData._id;
    } else if (responseData && responseData.data && responseData.data.id) {
      bookingId = responseData.data.id;
    } else if (responseData && responseData.id) {
      bookingId = responseData.id;
    } else {
      // Log the response structure for debugging
      console.error('Unable to find booking ID in response:', JSON.stringify(responseData));
      throw new Error('Booking created but could not retrieve booking ID');
    }
    
    console.log('Found booking ID:', bookingId);
    
    setSubmissionSuccess(true);
    
    // Redirect to the confirmation page with the booking ID
    router.push(`/CreateBooking/confirmation?bookingId=${bookingId}`);
  } catch (error) {
    console.error('Booking submission error:', error);
    setSubmissionError(error.message || 'Failed to complete booking. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

  // Loading state
  if (loading) {
    return <LoadingSpinner message="Loading ..." />;
  }

  // Error state
  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  // No property found
  if (!property) {
    return <div className={styles.error}>Property not found</div>;
  }

  // Display submission error if any
  /*if (submissionError) {
    // You could make this a toast notification instead
    alert(submissionError);
  }*/

  const clearError = () => {
    setSubmissionError('');
  };

  return (
    <div className={styles.pageContainer}>
      {/* Sidebar with booking summary */}
      <Sidebar 
        property={property}
        selectedDates={selectedDates}
        guests={guests}
        calculateNights={calculateNights}
        pricing={pricing}
        nightlyRate={nightlyRateParam}
        subtotal={subtotalParam}
        touristTax={touristTaxParam}
        serviceFee={serviceFeeParam}
        nights={nights}
        onDateEdit={() => toggleDatePopup(true)}
        onGuestsEdit={() => toggleGuestsPopup(true)}
      />

      {/* Main Content - Booking Steps */}
      <div className={styles.mainContent}>
        <BookingSteps 
          activeStep={activeStep}
          personalInfo={personalInfo}
          hostMessage={hostMessage}
          isPersonalInfoComplete={isPersonalInfoComplete}
          isHostMessageWritten={isHostMessageWritten}
          calculatePayments={() => ({
            total: pricing.total.toFixed(2),
            deposit: (pricing.total * 0.46).toFixed(2),
            remaining: (pricing.total * 0.54).toFixed(2)
          })}
          formatPaymentDate={() => {
            const arrivalDate = new Date(selectedDates.start);
            const paymentDate = new Date(arrivalDate);
            paymentDate.setDate(arrivalDate.getDate() - 7);
            return paymentDate.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short'
            });
          }}
          onStepToggle={handleStepToggle}
          onNextStep={handleNextStep}
          setPersonalInfo={setPersonalInfo}
          setIsPersonalInfoComplete={setIsPersonalInfoComplete}
          setHostMessage={setHostMessage}
          setIsHostMessageWritten={setIsHostMessageWritten}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          onSubmitBooking={handleSubmitBooking}
          isSubmitting={isSubmitting}
        />
      </div>
      <ErrorPopup error={submissionError} onClose={clearError} />
    </div>
  );
}