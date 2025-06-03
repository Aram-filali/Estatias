"use client";
import React, {  useCallback ,useState, useEffect } from 'react';
//import styles from '@/styles/createBooking.module.css';
import DateSelector from '@/src/components/CreateBooking/DateSelector';
import GuestSelector from '@/src/components/CreateBooking/GuestSelector';
import AuthPopup from '@/src/components/CreateBooking/AuthPopup'; // Import the new AuthPopup component
import ErrorPopup from '@/src/components/CreateBooking/Popup'; 
import { CancelBookingModal, StatusModal, useBookingModals } from '@/src/components/CreateBooking/CancelBookingModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseISO, format, differenceInDays, addDays } from 'date-fns';
import LoadingSpinner from '@/src/components/MyWebsite/loadingSpinner';
import { auth } from '@/src/firebase'; 
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import styles from './BookingUpdate.module.css';
//import AuthPopup from './components/AuthPopup'; // Import the new AuthPopup component
import { CheckCircle,XCircle, X, Check } from 'lucide-react';

export default function UpdateBookingInterface() {
  const router = useRouter();
  const [authState, setAuthState] = useState({
    checked: false,
    user: null,
    token: null,
    error: null
  });

  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState(null); 
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [error, setError] = useState(null);

  
  // Check authentication status
  useEffect(() => {
    const auth = getAuth();

    // Clear any existing data when auth check starts
    setAuthState({
      checked: false,
      user: null,
      token: null,
      error: null
    });
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const token = await user.getIdTokenResult(true);
          console.log("New authentication detected", user.email)
          
          setAuthState({
            checked: true,
            user: {
              email: user.email,
              uid: user.uid
            },
            token: token,
            error: null
          });
          //setAuthToken(token);
          setUserEmail(user.email);
          //const role = token.claims.role;
          //console.log("User role:", role);
          //setError(null);
        } else {
          console.log("No user found");
          console.log("User explicitly logged out");
          setAuthState({
            checked: true,
            user: null,
            token: null,
            error: null
          });
          setUserEmail(null);
          //setAuthToken(null);
        }
      } catch (err) {
        console.error("Error getting authentication token:", err);
        //setError("Authentication error. Please try logging in again.");
        setUserEmail(null);
        //setAuthToken(null);
        setAuthState({
          checked: true,
          user: null,
          token: null,
          error: "Authentication error. Please login again."
        });
      
      } finally {
        //setAuthChecked(true);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      // Reset state if component unmounts
      setAuthState({
        checked: false,
        user: null,
        token: null,
        error: null
      });
      setUserEmail(null);
    };
  }, [router]);


  

  // Authentication Popup Component
  /*const AuthPopup = () => {
    if (!showAuthPopup) return null;

    const handleLogin = () => {
      router.push('/Login');
    };

    const handleSignup = () => {
      router.push('/signUp');
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please login or create an account to update your booking.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Login
              </button>
              
              <button
                onClick={handleSignup}
                className="w-full bg-gray-100 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium border"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  */
  // State management
  const [bookingId, setBookingId] = useState(null);
  const [originalBooking, setOriginalBooking] = useState(null);
  const [property, setProperty] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('pending'); // Add booking status state

  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modes
  const [editingDates, setEditingDates] = useState(false);
  const [editingGuests, setEditingGuests] = useState(false);
  const [editingPersonalInfo, setEditingPersonalInfo] = useState(false);
  
  // Booking details state
  const [selectedDates, setSelectedDates] = useState({ 
    start: '', 
    end: '' 
  });
  
  const [guests, setGuests] = useState({
    adults: 1,
    children: 0,
    infants: 0
  });
  
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: ''
  });

  const [hostMessage, setHostMessage] = useState('');
  
  const [pricing, setPricing] = useState({
    nightlyRates: [],
    subtotal: 0,
    taxAmount: 0,
    serviceCharge: 0,
    total: 0
  });
  
  const [nights, setNights] = useState(0);
  const [bookingSegments, setBookingSegments] = useState([]);
  
  // Add submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  
  // Add state to track if changes were made
  const [hasChanges, setHasChanges] = useState(false);





  // Clear all booking data when authentication changes
  useEffect(() => {
    if (!authState.user && authState.checked) {
      // Reset all booking-related states when user logs out
      setBookingId(null);
      setOriginalBooking(null);
      setProperty(null);
      
      // Add all other state resets here...
    }
  }, [authState.user, authState.checked]);
  // Auth popup handlers
  const handleLogin = () => {
    setAuthState(prev => ({ ...prev, user: null, token: null }));
    router.push('/Login');
  };

  const handleSignup = () => {
    setAuthState(prev => ({ ...prev, user: null, token: null }));
    router.push('/signUp');
  };

 /* const handleCloseAuthPopup = () => {
    setShowAuthPopup(false);
  };*/


  // Helper function to check if booking can be modified
  const canModifyBooking = () => {
    return bookingStatus === 'pending' || bookingStatus === 'confirmed';
  };

  // Get status display information
  const getStatusInfo = () => {
    switch (bookingStatus) {
      case 'canceled':
      case 'cancelled':
        return {
          icon: XCircle,
          title: 'Booking Canceled',
          message: 'This booking has been canceled and cannot be modified.',
          className: 'canceled'
        };
      case 'rejected':
        return {
          icon: XCircle,
          title: 'Booking Rejected',
          message: 'This booking has been rejected by the host and cannot be modified.',
          className: 'rejected'
        };
      default:
        return null;
    }
  };

  // Status Notice Component
  const StatusNotice = () => {
    const statusInfo = getStatusInfo();
    
    if (!statusInfo) return null;

    const IconComponent = statusInfo.icon;

    return (
      <div className={`${styles.statusNotice} ${styles[statusInfo.className]}`}>
        <div className={styles.statusContent}>
          <IconComponent className={styles.statusIcon} />
          <div className={styles.statusText}>
            <h3 className={styles.statusTitle}>{statusInfo.title}</h3>
            <p className={styles.statusMessage}>{statusInfo.message}</p>
          </div>
        </div>
      </div>
    );
  };

  // Fetch existing booking data
  useEffect(() => {
    const fetchBookingData = async () => {
      if (!userEmail || showAuthPopup) {
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        
        // Fetch booking data
        const bookingResponse = await fetch(`${baseUrl}/bookings/by-email/${userEmail}`);
        
        if (!bookingResponse.ok) {
          throw new Error(`Failed to fetch booking: ${bookingResponse.status}`);
        }
        
        const bookingData = await bookingResponse.json();
        console.log('Fetched booking data:', bookingData);
        
        // Handle nested data structure
        const bookings = bookingData.data ||  [];
        
        if (bookings.length === 0) {
          throw new Error("No booking data received");
        }

        const booking = bookings[0]; // most recent booking
        const bookingId = booking._id; // ✅ get the booking ID
        console.log("Booking ID:", bookingId);
        setBookingId(bookingId)
        setOriginalBooking(booking);

        const status = booking.status || 'pending';
        setBookingStatus(status);
        console.log("Booking status:", status);
        
        // Pre-populate form fields from existing booking
        setSelectedDates({
          start: booking.checkInDate || booking.check_in_date || '',
          end: booking.checkOutDate || booking.check_out_date || ''
        });
        
        setGuests({
          adults: booking.guests?.adults || booking.adults || 1,
          children: booking.guests?.children || booking.children || 0,
          infants: booking.guests?.infants || booking.infants || 0
        });
        
        setPersonalInfo({
          fullName: booking.customer?.fullName || booking.guest_name || '',
          email: booking.customer?.email || booking.guest_email || '',
          phone: booking.customer?.phone || booking.guest_phone || '',
          message: booking.customer?.message || booking.special_requests || ''
        });
        
        setHostMessage(booking.customer?.additionalMessage || booking.host_message || '');
        
        // Set pricing from existing booking
        setPricing({
          nightlyRates: booking.nightlyRates || [],
          subtotal: booking.pricing?.subtotal || booking.subtotal || 0,
          taxAmount: booking.pricing?.taxAmount || booking.tax_amount || 0,
          serviceCharge: booking.pricing?.serviceCharge || booking.service_charge || 0,
          total: booking.pricing?.total || booking.total_price || 0
        });
        
        setNights(booking.nights || 0);
        setBookingSegments(booking.segments || []);
        
        // Fetch property data
        const propertyId = booking.propertyId || booking.property_id;
        if (propertyId) {
          const propertyResponse = await fetch(`${baseUrl}/properties/${propertyId}`);
          
          if (!propertyResponse.ok) {
            throw new Error(`Failed to fetch property: ${propertyResponse.status}`);
          }
          
          const propertyData = await propertyResponse.json();
          setProperty(propertyData);
          
          // Format availabilities
          const formattedAvailabilities = (propertyData.availabilities || [])
            .map(avail => ({
              ...avail,
              start_time: avail.start_time.split('T')[0],
              end_time: avail.end_time.split('T')[0]
            }))
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
          
          setAvailabilities(formattedAvailabilities);
        }
        
      } catch (err) {
        console.error("Fetch error:", err);
        if (userEmail && !showAuthPopup) {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data when user is authenticated
    if (userEmail && !showAuthPopup) {
      fetchBookingData();
    }
  }, [userEmail, showAuthPopup]);
  
  // Calculate nights whenever dates change
  useEffect(() => {
    if (selectedDates.start && selectedDates.end) {
      const start = new Date(selectedDates.start);
      const end = new Date(selectedDates.end);
      const calculatedNights = differenceInDays(end, start);
      
      if (nights !== calculatedNights) {
        setNights(calculatedNights);
      }
      
      // Check if dates changed from original
      if (originalBooking && canModifyBooking()) {
        const originalStart = originalBooking.checkInDate || originalBooking.check_in_date;
        const originalEnd = originalBooking.checkOutDate || originalBooking.check_out_date;
        if (selectedDates.start !== originalStart || selectedDates.end !== originalEnd) {
          if (!hasChanges) {
            setHasChanges(true);
          }
          calculateUpdatedPricing();
        }
      }
    } else {
      if (nights !== 0) setNights(0);
    }
  }, [selectedDates, originalBooking]);
  
  // Check for changes in guests
  useEffect(() => {
    if (originalBooking && canModifyBooking()) {
      const originalGuests = {
        adults: originalBooking.guests?.adults || originalBooking.adults || 1,
        children: originalBooking.guests?.children || originalBooking.children || 0,
        infants: originalBooking.guests?.infants || originalBooking.infants || 0
      };
      
      if (JSON.stringify(guests) !== JSON.stringify(originalGuests)) {
        setHasChanges(true);
      }
    }
  }, [guests, originalBooking, bookingStatus]);
  
  // Check for changes in personal info
  useEffect(() => {
    if (originalBooking && canModifyBooking()) {
      const originalPersonalInfo = {
        fullName: originalBooking.customer?.fullName || originalBooking.guest_name || '',
        email: originalBooking.customer?.email || originalBooking.guest_email || '',
        phone: originalBooking.customer?.phone || originalBooking.guest_phone || '',
        message: originalBooking.customer?.message || originalBooking.special_requests || ''
      };
      
      if (JSON.stringify(personalInfo) !== JSON.stringify(originalPersonalInfo)) {
        setHasChanges(true);
      }
      
      const originalHostMessage = originalBooking.customer?.additionalMessage || originalBooking.host_message || '';
      if (hostMessage !== originalHostMessage) {
        setHasChanges(true);
      }
    }
  }, [personalInfo, hostMessage, originalBooking, bookingStatus]);

  // Helper functions for pricing calculation
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
    const normalizedDate = new Date(dateObj);
    normalizedDate.setHours(12, 0, 0, 0);
    
    const availabilityRanges = availabilities.map(avail => ({
      start: parseISO(avail.start_time),
      end: parseISO(avail.end_time),
      price: avail.price,
      otherPlatformPrice: avail.otherPlatformPrice,
      isPrice: avail.isPrice,
      touristTax: avail.touristTax || 5
    }));
    
    return availabilityRanges.find(range => 
      isWithinInterval(normalizedDate, { start: range.start, end: range.end })
    );
  }

  // Calculate updated pricing based on new dates
  const calculateUpdatedPricing = useCallback(() => {
    if (!selectedDates.start || !selectedDates.end || !availabilities.length|| !canModifyBooking()) {
      return;
    }
    
    const start = parseISO(selectedDates.start);
    const end = parseISO(selectedDates.end);
    const nights = eachDayOfInterval({ start, end: addDays(end, -1) });
    
    const nightlyRates = [];
    const segments = [];
    let subtotal = 0;
    let taxAmount = 0;
    
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
    
    const serviceCharge = subtotal * 0.05;
    
    setPricing({
      nightlyRates,
      subtotal,
      taxAmount,
      serviceCharge,
      total: subtotal + taxAmount + serviceCharge
    });
    setBookingSegments(segments);
  }, [selectedDates, availabilities, bookingStatus]);

  // Handle date selection
  const handleDateSelect = ({ startDate, endDate }) => {
    if (startDate && endDate && canModifyBooking()) {
      setSelectedDates({
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd')
      });
    }
  };

  // Handle guest changes
  const handleGuestsChange = (newGuests) => {
    if (canModifyBooking()) {
      setGuests(newGuests);
    }
  };

  // Handle personal info changes
  const handlePersonalInfoChange = (field, value) => {
    if (canModifyBooking()) {
      setPersonalInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle booking update submission
  const handleUpdateBooking = async () => {
    if (!canModifyBooking()) {
      alert("This booking cannot be modified due to its current status.");
      return;
    }

    if (!hasChanges) {
      alert("No changes detected. Please make changes before updating the booking.");
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(false);
    
    try {
      if (!bookingSegments || bookingSegments.length === 0) {
        console.error('No booking segments available - regenerating...');
        calculateUpdatedPricing();
        
        if (!bookingSegments || bookingSegments.length === 0) {
          throw new Error('Unable to generate booking segments. Please try again.');
        }
      }

      const hostId = process.env.NEXT_PUBLIC_HOST_ID;
      
      if (!hostId) {
        throw new Error("Host ID not found in environment variables");
      }

      // Create the updated booking object
      const updatedBookingData = {
        propertyId: originalBooking.propertyId || originalBooking.property_id,
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
        },
        status: originalBooking.status || 'pending'
      };
      
      console.log('Sending booking update:', updatedBookingData);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      
      const response = await fetch(`${baseUrl}/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedBookingData),
      });
      
      const responseData = await response.json();
      console.log('Update API response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }
      
      console.log('Booking update successful:', responseData);
      setSubmissionSuccess(true);
      setHasChanges(false);
      
      setTimeout(() => {
        setSubmissionSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('Booking update error:', error);
      setSubmissionError(error.message || 'Failed to update booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  // Success Message with Auto-hide
  const AutoHideSuccessMessage = ({ 
    show, 
    message = "Booking updated successfully!", 
    onHide,
    duration = 5000,
    autoHide = true 
  }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    useEffect(() => {
      if (show) {
        setIsVisible(true);
        setIsAnimatingOut(false);
        
        if (autoHide && duration > 0) {
          const timer = setTimeout(() => {
            handleHide();
          }, duration);
          return () => clearTimeout(timer);
        }
      }
    }, [show, duration, autoHide]);

     const handleHide = () => {
      setIsAnimatingOut(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
        if (onHide) onHide();
      }, 300); // Match the fadeOut animation duration
    };

    if (!show && !isVisible) return null;

    return (
       <div className={`${styles.successContainer} ${isAnimatingOut ? styles.fadeOut : ''}`}>
      <div className={styles.contentWrapper}>
        <CheckCircle className={styles.icon} />
        <p className={styles.message}>{message}</p>
      </div>
      <button
        onClick={handleHide}
        className={styles.closeButton}
        aria-label="Close success message"
      >
        <X className={styles.closeIcon} />
      </button>
    </div>
    );
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format guest display
  const formatGuestDisplay = () => {
    const total = guests.adults + guests.children;
    let display = `${total} guest${total !== 1 ? 's' : ''}`;
    if (guests.infants > 0) {
      display += `, ${guests.infants} infant${guests.infants !== 1 ? 's' : ''}`;
    }
    return display;
  };



  const {
    confirmModal,
    statusModal,
    showConfirmModal,
    hideConfirmModal,
    setConfirmLoading,
    showStatusModal,
    hideStatusModal
  } = useBookingModals();

   const handleCancelBooking = async () => {
    // First check if booking status is pending
    if (originalBooking?.status !== 'pending') {
      showStatusModal(
              'error',
              'Cannot Cancel Booking',
              'This booking cannot be canceled. Only pending bookings can be canceled.'
            );  
      return;
    }
    
    // Show confirmation modal instead of window.confirm
    showConfirmModal();
  };

  const confirmCancelBooking = async () => {
    try {
        // Show loading state
        setConfirmLoading(true);

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        // Make API call to cancel booking
        const response = await fetch(`${baseUrl}/bookings/${bookingId}/cancel`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            // Add authorization header if needed
            // 'Authorization': `Bearer ${token}`
          },
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          // Hide confirm modal first
          hideConfirmModal();
          
          // Show success message
          showStatusModal(
            'success',
            'Booking Cancelled',
            'Your booking has been successfully cancelled.',
            true // auto-close after 3 seconds
          );

          // Refresh the page after a short delay
          setTimeout(() => {
            window.location.reload();
            // Or redirect to bookings list
            // router.push('/bookings');
          }, 2000);
        } else {
          hideConfirmModal();
          showStatusModal(
            'error',
            'Cancellation Failed',
            result.message || 'Failed to cancel booking. Please try again.'
          );
        }
      } catch (error) {
        console.error('Error canceling booking:', error);
         // Hide confirm modal and show error
      hideConfirmModal();
      showStatusModal(
        'error',
        'Network Error',
        'An error occurred while canceling the booking. Please check your connection and try again.'
      );
    }
  };

  const bookingDetails = originalBooking ? {
    date: originalBooking.date,
    time: originalBooking.time,
    service: originalBooking.service || originalBooking.type
  } : null;

  // Loading state
  if (loading) {
    return <LoadingSpinner message="Verifying authentication..." />;
  }

  // Error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h2 className={styles.errorTitle}>Error</h2>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      </div>
    );  
  }

  const clearError = () => {
    setSubmissionError('');
  };

  if (authState.error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h2 className={styles.errorTitle}>Authentication Error</h2>
          <p className={styles.errorMessage}>{authState.error}</p>
          <button 
            onClick={handleLogin}
            className={styles.primaryButton}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Authentication check - MUST come after loading/error checks
  if (!authState.user) {
    return (
      <AuthPopup
        isVisible={true} // Force visible
        onLogin={handleLogin}
        onSignup={handleSignup}
        title="Authentication Required"
        description="You must login or create an account to access this page."
        showSocialLogin={true}
      />
    );
  }



  return (
    <div className={styles.container}>
      {/* Header */}
      <StatusNotice />
      <div className={styles.header}>
        <h1 className={styles.title}>
          {canModifyBooking() ? 'Update Your Booking' : 'Your Booking Details'}
        </h1>
        <p className={styles.subtitle}>
          Booking ID: #{bookingId} • {property?.title || 'Loading...'}
        </p>
        {hasChanges && canModifyBooking() && (
          <div className={styles.changesAlert}>
            ⚠️ You have unsaved changes
          </div>
        )}
      </div>

      {/* Property Info */}
      {property && (
        <div className={styles.propertyCard}>
          <div className={styles.propertyInfo}>
            <img 
              src={property.mainPhotos?.[0] || '/luxury-luxury.webp'} 
              alt={property.title}
              className={styles.propertyImage}
            />
            <div className={styles.propertyDetails}>
              <h3 className={styles.propertyTitle}>{property.title}</h3>
              <div className={styles.propertyRating}>
                <span className={styles.ratingStar}>★</span>
                <span>{property.rating || "N/A"} ({property.reviews?.length || 0} reviews)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Sections */}
      <div className={styles.sectionsContainer}>
        {/* Dates Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionContent}>
              <h3 className={styles.sectionTitle}>Check-in & Check-out</h3>
              <div className={styles.sectionDetails}>
                <p><span className={styles.detailLabel}>Check-in:</span> {formatDisplayDate(selectedDates.start)}</p>
                <p><span className={styles.detailLabel}>Check-out:</span> {formatDisplayDate(selectedDates.end)}</p>
                <p className={styles.detailSubtext}>{nights} night{nights !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {/*{canModifyBooking() && (
              <button
                onClick={() => setEditingDates(true)}
                className={styles.editButton}
              >
                Edit Dates
              </button>
            )}*/}
          </div>

          {editingDates && canModifyBooking() && (
            <div className={styles.editSection}>
              <DateSelector
                onDateSelect={handleDateSelect}
                initialStartDate={selectedDates.start ? new Date(selectedDates.start) : null}
                initialEndDate={selectedDates.end ? new Date(selectedDates.end) : null}
                onClose={() => setEditingDates(false)}
              />
            </div>
          )}
        </div>

        {/* Guests Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionContent}>
              <h3 className={styles.sectionTitle}>Guests</h3>
              <div className={styles.sectionDetails}>
                <p>{formatGuestDisplay()}</p>
                <p className={styles.detailSubtext}>
                  {guests.adults} adult{guests.adults !== 1 ? 's' : ''}
                  {guests.children > 0 && `, ${guests.children} child${guests.children !== 1 ? 'ren' : ''}`}
                  {guests.infants > 0 && `, ${guests.infants} infant${guests.infants !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            {/*{canModifyBooking() && (
              <button
                onClick={() => setEditingGuests(true)}
                className={styles.editButton}
              >
                Edit Guests
              </button>
            )}*/}
          </div>

          {editingGuests && canModifyBooking() && (
            <div className={styles.editSection}>
              <GuestSelector
                initialGuests={guests}
                onGuestsChange={handleGuestsChange}
                maxGuests={property?.maxGuests || 3}
                onClose={() => setEditingGuests(false)}
              />
            </div>
          )}
        </div>

        {/* Personal Information Section */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionContent}>
              <h3 className={styles.sectionTitle}>Personal Information</h3>
              <div className={styles.sectionDetails}>
                <p><span className={styles.detailLabel}>Name:</span> {personalInfo.fullName}</p>
                <p><span className={styles.detailLabel}>Email:</span> {personalInfo.email}</p>
                <p><span className={styles.detailLabel}>Phone:</span> {personalInfo.phone}</p>
                {personalInfo.message && (
                  <p><span className={styles.detailLabel}>Special Requests:</span> {personalInfo.message}</p>
                )}
                {hostMessage && (
                  <p><span className={styles.detailLabel}>Message to Host:</span> {hostMessage}</p>
                )}
              </div>
            </div>
            {canModifyBooking() && (<button
              onClick={() => setEditingPersonalInfo(true)}
              className={styles.editButton}
            >
              Edit Info
            </button>)}
          </div>

          {editingPersonalInfo && (
            <div className={styles.editSection}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={personalInfo.fullName}
                    onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                    className={styles.formInput}
                  />
                </div>
              </div>
              <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                <label className={styles.formLabel}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={personalInfo.phone}
                  onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                <label className={styles.formLabel}>
                  Special Requests (Optional)
                </label>
                <textarea
                  value={personalInfo.message}
                  onChange={(e) => handlePersonalInfoChange('message', e.target.value)}
                  rows="3"
                  className={styles.formTextarea}
                  placeholder="Any special requests or notes..."
                />
              </div>
              <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
                <label className={styles.formLabel}>
                  Message to Host (Optional)
                </label>
                <textarea
                  value={hostMessage}
                  onChange={(e) => setHostMessage(e.target.value)}
                  rows="3"
                  className={styles.formTextarea}
                  placeholder="Introduce yourself and tell the host why you're traveling..."
                />
              </div>
              <div className={styles.formActions}>
                {canModifyBooking() && (<button
                  onClick={() => setEditingPersonalInfo(false)}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>)}
                {canModifyBooking() && (<button
                  onClick={() => setEditingPersonalInfo(false)}
                  className={styles.primaryButton}
                >
                  Save Changes
                </button>)}
              </div>
            </div>
          )}
        </div>

        {/* Price Summary */}
        <div className={styles.priceSummary}>
          <h3 className={styles.priceSummaryTitle}>Price Summary</h3>
          <div className={styles.priceItems}>
            <div className={styles.priceItem}>
              <span>${(pricing.subtotal / nights).toFixed(2)} × {nights} nights</span>
              <span>${pricing.subtotal.toFixed(2)}</span>
            </div>
            {pricing.taxAmount > 0 && (
              <div className={styles.priceItem}>
                <span>Tourist tax</span>
                <span>${pricing.taxAmount.toFixed(2)}</span>
              </div>
            )}
            {pricing.serviceCharge > 0 && (
              <div className={styles.priceItem}>
                <span>Service fee</span>
                <span>${pricing.serviceCharge.toFixed(2)}</span>
              </div>
            )}
            <div className={styles.priceTotal}>
              <span>Total</span>
              <span>${pricing.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className={styles.actionsFooter}>
        <div className={styles.mainActions}>
          {canModifyBooking() && (<button
            onClick={handleUpdateBooking}
            disabled={!hasChanges || isSubmitting}
            className={styles.primaryButton}
          >
            {isSubmitting && <span className={styles.loadingSpinner}></span>}
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </button>)}
          {/*<button
            onClick={handleViewBooking}
            className={styles.secondaryButton}
          >
            View Booking Details
          </button>*/}
        </div>
        <>
        <div className={styles.cancelActions}>
         {canModifyBooking() && ( <button
            onClick={handleCancelBooking}
            className={styles.cancelButton}
          >
            Cancel Booking
          </button>)}
        </div>
        {/* Modals */}
        <CancelBookingModal
          isOpen={confirmModal.isOpen}
          onClose={hideConfirmModal}
          onConfirm={confirmCancelBooking}
          loading={confirmModal.loading}
          bookingDetails={bookingDetails}
        />

        <StatusModal
          isOpen={statusModal.isOpen}
          onClose={hideStatusModal}
          type={statusModal.type}
          title={statusModal.title}
          message={statusModal.message}
          autoClose={statusModal.type === 'success'}
        />
        </>
      </div>
      {submissionSuccess && (
        <AutoHideSuccessMessage 
          show={submissionSuccess} 
          message="Booking updated successfully!"
          onHide={() => setSubmissionSuccess(false)}
          duration={5000}
          autoHide={true}
        />
      )}
      
      <AuthPopup
        isVisible={showAuthPopup}
        onLogin={handleLogin}
        onSignup={handleSignup}
        /*onClose={handleCloseAuthPopup}*/
        title="Authentication Required"
        description="Please login or create an account to update your booking."
        showSocialLogin={true}
        horizontalLayout={false}
      />
      <ErrorPopup error={submissionError} onClose={clearError} />

    </div>
    
  );
}
