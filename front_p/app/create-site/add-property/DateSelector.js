import React, { useState, useEffect, useCallback } from 'react';
import styles from './DateSelector.module.css';

// Utility function to format dates
const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString('en-US') : '';
};

// Function to check if two dates are on the same day
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return date1.toDateString() === date2.toDateString();
};

// Function to check if a date is between two other dates
const isDateInRange = (date, startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
};

// Function to compare dates without time
const isBeforeToday = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

const ExpandedCalendar = ({ onDateSelect, initialStartDate, initialEndDate, onClear }) => {
  const [isClient, setIsClient] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectionComplete, setSelectionComplete] = useState(false);
  const [today] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Initialize dates once when component mounts
  useEffect(() => {
    setIsClient(true);
    setStartDate(initialStartDate || null);
    setEndDate(initialEndDate || null);
  }, []);

  // Update internal state when props change (controlled component behavior)
  useEffect(() => {
    if (isClient) {
      setStartDate(initialStartDate || null);
      setEndDate(initialEndDate || null);
    }
  }, [initialStartDate, initialEndDate, isClient]);

  // Handle date selection
  const handleDateClick = (date) => {
    // Reject dates before today
    if (isBeforeToday(date)) {
      return;
    }
    
    if (!startDate || (startDate && endDate)) {
      // Start a new selection
      setStartDate(date);
      setEndDate(null);
      setSelectionComplete(false);
    } else {
      // Complete the selection
      setSelectionComplete(true);
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  // Notify parent only when selection is complete
  useEffect(() => {
    if (!isClient || !selectionComplete) return;
    
    if (onDateSelect && startDate && endDate) {
      onDateSelect({ startDate, endDate });
      setSelectionComplete(false); // Reset to prevent repeated calls
    }
  }, [selectionComplete, startDate, endDate, onDateSelect, isClient]);

  // Handle hover to visualize range
  const handleDateHover = (date) => {
    if (startDate && !endDate) {
      setHoverDate(date);
    }
  };

  // FIX: Fixed the month navigation functions to properly prevent event propagation
  const goToPreviousMonth = (e) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent event bubbling
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const goToNextMonth = (e) => {
    e.preventDefault(); // Prevent form submission
    e.stopPropagation(); // Prevent event bubbling
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Handle clear dates
  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    if (onClear) {
      onClear();
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();

    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    ).getDay();

    // Adjust so the week starts on Monday (0 = Monday, 6 = Sunday)
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const days = [];

    // Previous month's days to complete the first week
    const prevMonthDays = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      0
    ).getDate();

    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        prevMonthDays - i
      );
      days.push({
        date,
        isCurrentMonth: false
      });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        i
      );
      days.push({
        date,
        isCurrentMonth: true
      });
    }

    // Fill the calendar with next month's days
    const totalCells = Math.ceil((adjustedFirstDay + daysInMonth) / 7) * 7;
    const nextMonthDays = totalCells - days.length;

    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        i
      );
      days.push({
        date,
        isCurrentMonth: false
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (!isClient) return null;

  return (
    <div className={styles.expandedCalendar}>
      <div className={styles.calendarNavigation}>
        {/* FIX: Added type="button" to prevent form submission and additional handlers */}
        <button 
          className={styles.navvButton} 
          onClick={goToPreviousMonth}
          onMouseDown={(e) => e.stopPropagation()}
          type="button"
          aria-label="Previous month"
        >
          &lt;
        </button>
        <div className={styles.currentMonthYear}>
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        {/* FIX: Added type="button" to prevent form submission and additional handlers */}
        <button 
          className={styles.navvButton} 
          onClick={goToNextMonth}
          onMouseDown={(e) => e.stopPropagation()}
          type="button"
          aria-label="Next month"
        >
          &gt;
        </button>
      </div>


      <div className={styles.weekDaysHeader}>
        {weekDays.map(day => (
          <div key={day} className={styles.weekDay}>{day}</div>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {calendarDays.map((dayObj, index) => {
          const { date, isCurrentMonth } = dayObj;

          const isStart = startDate && isSameDay(date, startDate);
          const isEnd = endDate && isSameDay(date, endDate);
          const isInRange = startDate && (
            endDate 
              ? isDateInRange(date, startDate, endDate)
              : hoverDate && isDateInRange(date, startDate, hoverDate)
          );
          const isPastDate = isBeforeToday(date);

          const dayClassNames = [
            styles.calendarDay,
            !isCurrentMonth && styles.otherMonth,
            isPastDate && styles.disabledDate,
            isStart && styles.startDate,
            isEnd && styles.endDate,
            isInRange && styles.inRange,
          ].filter(Boolean).join(' ');

          return (
            <div
              key={index}
              className={dayClassNames}
              onClick={() => handleDateClick(date)}
              onMouseEnter={() => handleDateHover(date)}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      {startDate && (
        <div className={styles.selectedDates}>
          <div>{formatDate(startDate)}</div>
          {endDate && (
            <>
              <div>-</div>
              <div>{formatDate(endDate)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const DateSelector = ({ 
  onDateSelect, 
  initialStartDate, 
  initialEndDate, 
  onClose,
  alwaysVisible = false
}) => {
  const [isClient, setIsClient] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  // Initialize once on mount
  useEffect(() => {
    setIsClient(true);
    
    // Ensure initial dates aren't in the past
    const validInitialStartDate = initialStartDate && !isBeforeToday(initialStartDate) 
      ? initialStartDate 
      : null;
      
    const validInitialEndDate = initialEndDate && !isBeforeToday(initialEndDate)
      ? initialEndDate
      : null;
      
    setStartDate(validInitialStartDate);
    setEndDate(validInitialEndDate);
  }, []);

  // Update internal state when props change
  useEffect(() => {
    if (isClient) {
      // Validate prop dates aren't in the past
      const validStartDate = initialStartDate && !isBeforeToday(initialStartDate)
        ? initialStartDate
        : null;
        
      const validEndDate = initialEndDate && !isBeforeToday(initialEndDate)
        ? initialEndDate
        : null;
        
      setStartDate(validStartDate);
      setEndDate(validEndDate);
    }
  }, [initialStartDate, initialEndDate, isClient]);

  // Use useCallback to prevent function recreation on every render
  const handleDateSelection = useCallback(({ startDate, endDate }) => {
    setStartDate(startDate);
    setEndDate(endDate);
    
    if (onDateSelect) {
      onDateSelect({ startDate, endDate });
    }
  }, [onDateSelect]);

  const clearDates = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    if (onDateSelect) {
      onDateSelect({ startDate: null, endDate: null });
    }
  }, [onDateSelect]);

  if (!isClient) return null;

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <p className={styles.datesInfo}>
          Select your dates
        </p>
      </div>
      
      <div className={styles.calendarContent}>
        <ExpandedCalendar 
          onDateSelect={handleDateSelection} 
          initialStartDate={startDate} 
          initialEndDate={endDate} 
          onClear={clearDates}
        />
      </div>
      
      <div className={styles.calendarActions}>
        {/* FIX: Added type="button" to prevent form submission */}
        <button 
          className={styles.clearrButton}
          onClick={clearDates}
          type="button"
        >
          Clear
        </button>
        {!alwaysVisible && onClose && (
          <button 
            className={styles.saveButton}
            onClick={onClose}
            type="button"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
};

export default DateSelector;