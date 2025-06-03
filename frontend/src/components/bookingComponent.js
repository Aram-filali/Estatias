//bookingComponent.js
"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek,
  endOfWeek,
  eachDayOfInterval, 
  isSameDay, 
  isBefore, 
  isAfter, 
  parseISO, 
  differenceInDays, 
  isWithinInterval,
  addDays,
  isSameMonth
} from 'date-fns';

const BookingComponent = ({ propertyId, maxGuest = 4, minNight = 1, maxNight = 14 }) => {
  const router = useRouter();
  
  // State for date selection
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  const [isDatePopupOpen, setIsDatePopupOpen] = useState(false);
  
  // State for guest selection
  const [isGuestPopupOpen, setIsGuestPopupOpen] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  
  // State for property data
  const [property, setProperty] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numberOfNights, setNumberOfNights] = useState(0);
  
  // Pricing state
  const [pricing, setPricing] = useState({
    nightlyRates: [],
    subtotal: 0,
    taxAmount: 0,
    total: 0,
    serviceCharge: 0
  });

  // Transform availabilities to date range objects for easier checking
  const availabilityRanges = useMemo(() => {
    return availabilities.map(avail => ({
      start: parseISO(avail.start_time),
      end: parseISO(avail.end_time),
      price: avail.price,
      touristTax: avail.touristTax || 5 // Default to 5% if not specified
    }));
  }, [availabilities]);

  // Fetch property data including availabilities
  useEffect(() => {
    const fetchPropertyData = async () => {
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
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchPropertyData();
    } else {
      // For demo/development purposes - create mock data if no propertyId
      const today = new Date();
      const mockAvailabilities = [
        {
          start_time: format(today, 'yyyy-MM-dd'),
          end_time: format(addMonths(today, 2), 'yyyy-MM-dd'),
          price: 120,
          touristTax: 5
        }
      ];
      
      setProperty({
        name: "Demo Property",
        rating: 4.8,
        reviews: Array(15).fill({}),
        policies: {
          cancellation_policy: "Free cancellation up to 48 hours before check-in",
          check_in_start: "3:00 PM",
          check_in_end: "10:00 PM",
          check_out_start: "11:00 AM",
          pets: false
        }
      });
      
      setAvailabilities(mockAvailabilities);
      setLoading(false);
    }
  }, [propertyId]);

  // Function to check if a date is available
  const isDateAvailable = useCallback((date) => {
    if (!availabilityRanges.length) return false;
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    // Create a new date object to avoid mutation and set to noon to avoid timezone issues
    const normalizedDate = new Date(dateObj);
    normalizedDate.setHours(12, 0, 0, 0);
    
    return availabilityRanges.some(range => 
      isWithinInterval(normalizedDate, { start: range.start, end: range.end })
    );
  }, [availabilityRanges]);

  // Function to check if a date is selectable given existing check-in date
  const isDateSelectable = useCallback((date) => {
    // If no check-in date is selected, any available date is selectable
    if (!checkInDate) return isDateAvailable(date);
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const checkInObj = parseISO(checkInDate);
    
    // If date is before check-in, it's selectable (to reset check-in date)
    if (isBefore(dateObj, checkInObj)) return isDateAvailable(date);
    
    // If date is after check-in, we need to check several conditions
    // 1. Is it within min/max nights?
    const nightCount = differenceInDays(dateObj, checkInObj);
    if (nightCount < minNight || nightCount > maxNight) return false;
    
    // 2. Are all dates in between available?
    const datesInRange = eachDayOfInterval({ 
      start: checkInObj, 
      end: addDays(dateObj, -1) // Exclude the checkout day itself
    });
    
    return datesInRange.every(day => isDateAvailable(day));
  }, [checkInDate, isDateAvailable, minNight, maxNight]);

  // Find the specific availability for a date
  const findAvailabilityForDate = useCallback((date) => {
    if (!availabilityRanges.length) return null;
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    // Create a new date object to avoid mutation and set to noon to avoid timezone issues
    const normalizedDate = new Date(dateObj);
    normalizedDate.setHours(12, 0, 0, 0);
    
    return availabilityRanges.find(range => 
      isWithinInterval(normalizedDate, { start: range.start, end: range.end })
    );
  }, [availabilityRanges]);

  // Calculate pricing based on selected dates
  const calculatePricing = useCallback(() => {
    if (!checkInDate || !checkOutDate || !availabilityRanges.length) {
      setPricing({
        nightlyRates: [],
        subtotal: 0,
        taxAmount: 0,
        serviceCharge: 0,
        total: 0
      });
      return;
    }
    
    const start = parseISO(checkInDate);
    const end = parseISO(checkOutDate);
    const nights = eachDayOfInterval({ start, end: addDays(end, -1) }); // Exclude checkout day
    setNumberOfNights(nights.length);
    const nightlyRates = [];
    let subtotal = 0;
    let taxAmount = 0;
    
    // Calculate price for each night
    nights.forEach(night => {
      const availability = findAvailabilityForDate(night);
      
      if (availability) {
        const dateStr = format(night, 'yyyy-MM-dd');
        nightlyRates.push({
          date: dateStr,
          price: availability.price,
          otherPlatformPrice: availability.isPrice ? availability.otherPlatformPrice : null,
          taxRate: availability.touristTax
        });
        
        subtotal += availability.price;
        taxAmount += availability.price * (availability.touristTax / 100) * adults;
      }
    });
    
    // Add service charge (typically around 5% of subtotal)
    const serviceCharge = subtotal * 0.05;
    
    setPricing({
      nightlyRates,
      subtotal,
      taxAmount,
      serviceCharge,
      total: subtotal + taxAmount + serviceCharge
    });
  }, [checkInDate, checkOutDate, availabilityRanges, findAvailabilityForDate, adults]);

  // Recalculate pricing whenever dates change
  useEffect(() => {
    calculatePricing();
  }, [checkInDate, checkOutDate, calculatePricing, adults]);

  // Calendar navigation functions
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToPrevMonth = () => {
    const today = new Date();
    const newDate = subMonths(currentMonth, 1);
    
    // Prevent going to past months
    if (newDate.getMonth() >= today.getMonth() || newDate.getFullYear() > today.getFullYear()) {
      setCurrentMonth(newDate);
    }
  };

  // Date selection handler
  const handleDateSelect = (dateStr) => {
    const selectedDate = dateStr;
    
    if (!checkInDate || (checkInDate && checkOutDate)) {
      // Start a new selection
      setCheckInDate(selectedDate);
      setCheckOutDate(null);
    } else if (checkInDate && !checkOutDate) {
      // Complete a selection
      if (selectedDate > checkInDate) {
        // Calculate nights between the dates
        const start = parseISO(checkInDate);
        const end = parseISO(selectedDate);
        const nightCount = differenceInDays(end, start);
        
        // Validate night count against min/max
        if (nightCount < minNight) {
          alert(`Minimum stay is ${minNight} nights`);
          return;
        }
        
        if (nightCount > maxNight) {
          alert(`Maximum stay is ${maxNight} nights`);
          return;
        }
        
        // Validate that all dates in range are available
        const datesInRange = eachDayOfInterval({ start, end: addDays(end, -1) });
        const allDatesAvailable = datesInRange.every(date => isDateAvailable(date));
        
        if (!allDatesAvailable) {
          alert("Not all dates in the selected range are available. Please choose another range.");
          return;
        }
        
        setCheckOutDate(selectedDate);
        setIsDatePopupOpen(false);
      } else {
        // If selecting a date before current check-in, reset check-in
        setCheckInDate(selectedDate);
        setCheckOutDate(null);
      }
    }
  };
  
  // Handle date hover for showing potential range
  const handleDateHover = (dateStr) => {
    if (checkInDate && !checkOutDate) {
      setHoveredDate(dateStr);
    } else {
      setHoveredDate(null);
    }
  };

  // Generate calendar days
  const generateCalendarDays = useCallback((month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const isToday = isSameDay(day, today);
      const isPastDate = isBefore(day, today);
      const isAvailable = isDateAvailable(day);
      const isSelectable = isDateSelectable(day);
      const isInCurrentMonth = isSameMonth(day, month);
      const isSelected = checkInDate === dateStr || checkOutDate === dateStr;
      
      // Handle range display (between check-in and either check-out or hovered date)
      let isInRange = false;
      if (checkInDate && (checkOutDate || hoveredDate)) {
        const rangeEnd = checkOutDate || hoveredDate;
        isInRange = dateStr > checkInDate && dateStr < rangeEnd;
      }
      
      // Get price if available
      const availability = isAvailable ? findAvailabilityForDate(day) : null;
      const price = availability?.price || null;
      
      return {
        date: dateStr,
        day: day.getDate(),
        isToday,
        isPastDate,
        isAvailable: isAvailable && !isPastDate,
        isSelectable: isSelectable && !isPastDate,
        isInCurrentMonth,
        isSelected,
        isInRange,
        isCheckIn: checkInDate === dateStr,
        isCheckOut: checkOutDate === dateStr,
        price
      };
    });
  }, [checkInDate, checkOutDate, hoveredDate, isDateAvailable, isDateSelectable, findAvailabilityForDate]);

  // Render a single calendar month
  const renderCalendarMonth = useCallback((month) => {
    const days = generateCalendarDays(month);
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    
    return (
      <div className="calendar-month">
        <div className="calendar-month-header">
          {format(month, 'MMMM yyyy')}
        </div>
        <div className="weekdays">
          {weekDays.map(day => (
            <div key={day} className="weekday">{day}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((dayInfo) => (
            <div 
              key={dayInfo.date}
              className={`calendar-day
                ${!dayInfo.isInCurrentMonth ? 'outside-month' : ''}
                ${dayInfo.isToday ? 'today' : ''} 
                ${dayInfo.isPastDate ? 'disabled' : ''}
                ${!dayInfo.isAvailable ? 'disabled' : ''}
                ${!dayInfo.isSelectable ? 'disabled' : ''}
                ${dayInfo.isSelected ? 'selected' : ''}
                ${dayInfo.isInRange ? 'in-range' : ''}
                ${dayInfo.isCheckIn ? 'check-in' : ''}
                ${dayInfo.isCheckOut ? 'check-out' : ''}
              `}
              onClick={() => dayInfo.isSelectable && handleDateSelect(dayInfo.date)}
              onMouseEnter={() => handleDateHover(dayInfo.date)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <span className="day-number">{dayInfo.day}</span>
              {dayInfo.isAvailable && dayInfo.price && dayInfo.isInCurrentMonth && (
                <span className="day-price">${dayInfo.price}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }, [generateCalendarDays, handleDateSelect]);

  // Handle booking button click
  const handleBookingClick = () => {
    // Validate all required information is available
    if (!checkInDate || !checkOutDate) {
      alert("Please select check-in and check-out dates");
      return;
    }
    
    const totalGuests = adults + children;
    if (totalGuests === 0) {
      alert("Please add at least one guest");
      return;
    }
    
    if (totalGuests > maxGuest) {
      alert(`This property can only accommodate up to ${maxGuest} guests`);
      return;
    }
    
    // Navigate to booking page with details
    const params = new URLSearchParams({
      propertyId: propertyId || '',
      checkIn: checkInDate || '',
      checkOut: checkOutDate || '',
      adults: String(adults || 0),
      children: String(children || 0),
      infants: String(infants || 0),
      totalPrice: pricing?.total?.toFixed(2) || '0',
      subtotal: pricing?.subtotal?.toFixed(2) || '0',
      nightlyRate: numberOfNights > 0 ? (pricing.subtotal / numberOfNights).toFixed(2) : '0',
      touristTax: pricing?.taxAmount?.toFixed(2) || '0',
      serviceFee: pricing?.serviceCharge?.toFixed(2) || '0',
      nights: String(numberOfNights || 0)
    });

    router.push(`/CreateBooking?${params.toString()}`);
  };

  // Guest handling functions
  const handleGuestChange = (type, action) => {
    const totalGuests = adults + children ;
    
    if (type === "adults") {
      if (action === "inc" && (totalGuests < maxGuest)) {
        setAdults(prev => prev + 1);
      } else if (action === "dec" && adults > 1) {
        setAdults(prev => prev - 1);
      }
    } else if (type === "children") {
      if (action === "inc" && (totalGuests < maxGuest)) {
        setChildren(prev => prev + 1);
      } else if (action === "dec" && children > 0) {
        setChildren(prev => prev - 1);
      }
    } else if (type === "infants") {
      if (action === "inc" && infants < 5) {
        setInfants(prev => prev + 1);
      } else if (action === "dec" && infants > 0) {
        setInfants(prev => prev - 1);
      }
    }
  };

  // Calculate nights between dates
  const getNightCount = () => {
    if (!checkInDate || !checkOutDate) return 0;
    return differenceInDays(parseISO(checkOutDate), parseISO(checkInDate));
  };

  // Get current price for display
  const getCurrentPrice = () => {
    if (!availabilityRanges.length) return { price: "—", otherPlatformPrice: null };
    
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    
    const todayAvailability = findAvailabilityForDate(today);
    if (todayAvailability) {
      return { 
        price: todayAvailability.price,
        otherPlatformPrice: todayAvailability.isPrice ? todayAvailability.otherPlatformPrice : null
      };
    }
    
    // If today is not available, find the next available date
    const nextAvailable = availabilityRanges.find(range => isAfter(range.end, today));
    return nextAvailable ? { 
      price: nextAvailable.price,
      otherPlatformPrice: nextAvailable.isPrice ? nextAvailable.otherPlatformPrice : null
    } : { price: "—", otherPlatformPrice: null };
  };

  // Get sample policies from property
  const getSamplePolicies = () => {
    if (!property || !property.policies) return null;
    
    const policies = [];
    if (property.policies.cancellation_policy) {
      policies.push(`Cancellation policy: ${property.policies.cancellation_policy}`);
    }
    
    if (property.policies.check_in_start && property.policies.check_in_end) {
      policies.push(`Check-in: ${property.policies.check_in_start} - ${property.policies.check_in_end}`);
    }
    
    if (property.policies.check_out_start) {
      policies.push(`Check-out by: ${property.policies.check_out_start}`);
    }
    
    return policies.length > 0 ? policies : null;
  };

  if (loading) {
    return (
      <div className="booking-component loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading booking details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-component error">
        <div className="error-icon">⚠️</div>
        <div className="error-message">Error loading booking data: {error}</div>
      </div>
    );
  }

  const nightCount = getNightCount();
  const totalGuests = adults + children;
  const samplePolicies = getSamplePolicies();
  const currentPrice = getCurrentPrice();

  return (
    <div className="booking-column">
      <div className="booking-sticky-container">
        <div className="booking-component">
          <div className="booking-header">
            <div className="price-display">
              {currentPrice.otherPlatformPrice ? (
                <>
                  <span className="strikethrough-price">${currentPrice.otherPlatformPrice}</span>
                  <span className="actual-price"> ${currentPrice.price}</span>
                </>
              ) : (
                <>${currentPrice.price}</>
              )}
              <span className="price-unit">/ night</span>
            </div>
            {property && property.reviews && (
              <div className="rating-display">
                <span className="star-icon">★</span>
                <span>{property.rating || "New"}</span>
                <span className="rating-count">
                  {property.reviews?.length ? `(${property.reviews.length} reviews)` : ""}
                </span>
              </div>
            )}
          </div>

          <div className="booking-form">
            <div className="booking-dates" onClick={() => setIsDatePopupOpen(true)}>
              <div className="date-picker-field check-in">
                <label>CHECK-IN</label>
                <div>{checkInDate ? format(parseISO(checkInDate), 'MMM d, yyyy') : 'Add date'}</div>
              </div>
              <div className="date-picker-field check-out">
                <label>CHECKOUT</label>
                <div>{checkOutDate ? format(parseISO(checkOutDate), 'MMM d, yyyy') : 'Add date'}</div>
              </div>
            </div>

            <div className="booking-guests" onClick={() => setIsGuestPopupOpen(true)}>
              <div className="guest-picker-field">
                <label>GUESTS</label>
                <div>
                  {totalGuests} {totalGuests === 1 ? 'guest' : 'guests'}
                  {infants > 0 && `, ${infants} ${infants === 1 ? 'infant' : 'infants'}`}
                </div>
              </div>
            </div>
          </div>

          {isDatePopupOpen && (
            <div className="popup-overlay date-popup">
              <div className="popup-content calendar-popup">
                <div className="calendar-navigation">
                  <button 
                    className="calendar-nav-button" 
                    onClick={goToPrevMonth}
                    aria-label="Previous month"
                  >
                    ←
                  </button>
                  <div className="calendar-current-month">
                    {format(currentMonth, 'MMMM yyyy')}
                  </div>
                  <button 
                    className="calendar-nav-button" 
                    onClick={goToNextMonth}
                    aria-label="Next month"
                  >
                    →
                  </button>
                </div>
                
                <div className="calendar-container">
                  <div className="calendar-months">
                    {renderCalendarMonth(currentMonth)}
                    {renderCalendarMonth(addMonths(currentMonth, 1))}
                  </div>
                  
                  <div className="calendar-footer">
                    <div className="calendar-legend">
                      <div className="legend-item">
                        <div className="legend-color available"></div>
                        <span>Available</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color selected"></div>
                        <span>Selected</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color unavailable"></div>
                        <span>Unavailable</span>
                      </div>
                    </div>
                    
                    <div className="calendar-info">
                      <p>Min stay: {minNight} nights • Max stay: {maxNight} nights</p>
                    </div>
                    
                    <div className="calendar-actions">
                      <button 
                        className="clear-dates-button"
                        onClick={() => {
                          setCheckInDate(null);
                          setCheckOutDate(null);
                        }}
                      >
                        Clear dates
                      </button>
                      <button 
                        className="close-button"
                        onClick={() => setIsDatePopupOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isGuestPopupOpen && (
            <div className="popup-overlay guest-popup">
              <div className="popup-content">
                <div className="popup-header">
                  <h3>Guests</h3>
                  <button 
                    className="close-popup-button" 
                    onClick={() => setIsGuestPopupOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                
                <div className="guests-container">
                  <div className="guest-row">
                    <div className="guest-type">
                      <div className="guest-label">Adults</div>
                      <div className="guest-sublabel">Age 13+</div>
                    </div>
                    <div className="guest-counter">
                      <button 
                        className="guest-button" 
                        onClick={() => handleGuestChange('adults', 'dec')}
                        disabled={adults <= 1}
                        aria-label="Decrease adults"
                      >
                        −
                      </button>
                      <span className="guest-count">{adults}</span>
                      <button 
                        className="guest-button" 
                        onClick={() => handleGuestChange('adults', 'inc')}
                        disabled={totalGuests >= maxGuest}
                        aria-label="Increase adults"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="guest-row">
                    <div className="guest-type">
                      <div className="guest-label">Children</div>
                      <div className="guest-sublabel">Ages 2-12</div>
                    </div>
                    <div className="guest-counter">
                      <button 
                        className="guest-button" 
                        onClick={() => handleGuestChange('children', 'dec')}
                        disabled={children <= 0}
                        aria-label="Decrease children"
                      >
                        −
                      </button>
                      <span className="guest-count">{children}</span>
                      <button 
                        className="guest-button" 
                        onClick={() => handleGuestChange('children', 'inc')}
                        disabled={totalGuests >= maxGuest}
                        aria-label="Increase children"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="guest-row">
                    <div className="guest-type">
                      <div className="guest-label">Infants</div>
                      <div className="guest-sublabel">Under 2</div>
                    </div>
                    <div className="guest-counter">
                      <button 
                        className="guest-button" 
                        onClick={() => handleGuestChange('infants', 'dec')}
                        disabled={infants <= 0}
                        aria-label="Decrease infants"
                      >
                        −
                      </button>
                      <span className="guest-count">{infants}</span>
                      <button 
                        className="guest-button" 
                        onClick={() => handleGuestChange('infants', 'inc')}
                        disabled={infants >= 5}
                        aria-label="Increase infants"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="guest-policy">
                    <p>This place has a maximum of {maxGuest} guests.</p>
                    {property && property.policies && (
                      <p>{property.policies.pets ? "Pets are allowed." : "Pets aren't allowed."}</p>
                    )}
                  </div>
                  
                  <div className="guest-actions">
                    <button 
                      className="done-button"
                      onClick={() => setIsGuestPopupOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button 
            className={`booking-button ${(!checkInDate || !checkOutDate || totalGuests === 0) ? 'disabled' : ''}`}
            onClick={handleBookingClick}
            disabled={!checkInDate || !checkOutDate || totalGuests === 0}
          >
            {checkInDate && checkOutDate ? 'Reserve' : 'Check availability'}
          </button>

          {checkInDate && checkOutDate && (
            <div className="booking-summary">
              <div className="price-breakdown">
                <div className="price-row">
                  <div className="price-description">
                  {pricing.nightlyRates[0]?.otherPlatformPrice ? (
                    <>
                      <span className="strikethrough-price">${pricing.nightlyRates[0].otherPlatformPrice}</span>
                      <span> ${(pricing.subtotal / nightCount).toFixed(2)}</span>
                    </>
                  ) : (
                    <>${(pricing.subtotal / nightCount).toFixed(2)}</>
                  )}
                  × {nightCount} nights
                </div>
                  <div className="price-amount">${pricing.subtotal.toFixed(2)}</div>
                </div>
                <div className="price-row">
                  <div className="price-description">Tourist Tax</div>
                  <div className="price-amount">${pricing.taxAmount.toFixed(2)}</div>
                </div>
                <div className="price-row">
                  <div className="price-description">Service Fee</div>
                  <div className="price-amount">${pricing.serviceCharge.toFixed(2)}</div>
                </div>
                <div className="total-row">
                  <div className="total-description">Total</div>
                  <div className="total-amount">${pricing.total.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
          
          {samplePolicies && (
            <div className="booking-policies">
              <h3 className="policies-header">Important Information</h3>
              <ul className="policies-list">
                {samplePolicies.map((policy, index) => (
                  <li key={index} className="policy-item">{policy}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingComponent;