import React, { useState, useEffect } from 'react';
import styles from './DateSelector.module.css';

// Utility function to format dates
const formatDate = (date) => {
  return date ? new Date(date).toLocaleDateString('en-US') : '';
};

// Function to check if two dates are on the same day
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Function to check if a date is between two other dates
const isDateInRange = (date, startDate, endDate) => {
  if (!startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
};

const ExpandedCalendar = ({ onDateSelect, initialStartDate, initialEndDate }) => {
  const [startDate, setStartDate] = useState(initialStartDate || null);
  const [endDate, setEndDate] = useState(initialEndDate || null);
  const [hoverDate, setHoverDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Handling date selection
  const handleDateClick = (date) => {
    if (!startDate || (startDate && endDate)) {
      // Start a new selection
      setStartDate(date);
      setEndDate(null);
    } else {
      // Complete the selection
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  // Notify the parent when the dates change
  useEffect(() => {
    if (onDateSelect && startDate && endDate) {
      onDateSelect({ startDate, endDate });
    }
  }, [startDate, endDate, onDateSelect]);

  // Handle hover to visualize the range
  const handleDateHover = (date) => {
    if (startDate && !endDate) {
      setHoverDate(date);
    }
  };

  // Generate the previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Generate the next month
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Generate the days of the month
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

    // Days of the previous month to complete the first week
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
        isCurrentMonth: false,
        isDisabled: true
      });
    }

    // Days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        i
      );
      days.push({
        date,
        isCurrentMonth: true,
        isDisabled: date < new Date() // Disable past dates
      });
    }

    // Complete the calendar with days of the next month
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
        isCurrentMonth: false,
        isDisabled: true
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={styles.expandedCalendar}>
      <div className={styles.calendarNavigation}>
        <button 
          className={styles.navButton} 
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          &lt;
        </button>
        <div className={styles.currentMonthYear}>
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        <button 
          className={styles.navButton} 
          onClick={goToNextMonth}
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
          const { date, isCurrentMonth, isDisabled } = dayObj;
          
          const isStart = startDate && isSameDay(date, startDate);
          const isEnd = endDate && isSameDay(date, endDate);
          const isInRange = startDate && (
            endDate 
              ? isDateInRange(date, startDate, endDate)
              : hoverDate && isDateInRange(date, startDate, hoverDate)
          );

          const dayClassNames = [
            styles.calendarDay,
            !isCurrentMonth && styles.otherMonth,
            isDisabled && styles.disabledDay,
            isStart && styles.startDate,
            isEnd && styles.endDate,
            isInRange && styles.inRange,
          ].filter(Boolean).join(' ');

          return (
            <div
              key={index}
              className={dayClassNames}
              onClick={() => !isDisabled && handleDateClick(date)}
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
  onClose 
}) => {
  const [startDate, setStartDate] = useState(initialStartDate || null);
  const [endDate, setEndDate] = useState(initialEndDate || null);

  const handleDateSelection = ({ startDate, endDate }) => {
    setStartDate(startDate);
    setEndDate(endDate);
    if (onDateSelect) {
      onDateSelect({ startDate, endDate });
    }
  };

  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
    if (onDateSelect) {
      onDateSelect({ startDate: null, endDate: null });
    }
  };

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <p className={styles.datesInfo}>
          Minimum stay: 3 nights · Available dates shown in white
        </p>
      </div>
      
      <div className={styles.calendarContent}>
        <ExpandedCalendar 
          onDateSelect={handleDateSelection} 
          initialStartDate={startDate} 
          initialEndDate={endDate} 
        />
      </div>
      
      <div className={styles.calendarActions}>
        <button 
          className={styles.clearButton}
          onClick={clearDates}
        >
          Clear dates
        </button>
        <button 
          className={styles.saveButton}
          onClick={onClose}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default DateSelector;
