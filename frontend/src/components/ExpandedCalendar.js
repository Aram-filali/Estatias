"use client";
import React, { useState, useMemo, useEffect } from 'react';
import styles from '../../styles/createBooking.module.css';

// Utility function to generate calendar days
const generateCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  // Add padding days for the first week
  const startingDayOfWeek = firstDay.getDay();
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // Add actual days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  return days;
};

// Utility to get month name
const getMonthName = (month) => {
  return new Date(2025, month, 1).toLocaleString('default', { month: 'long' });
};

export default function ExpandedCalendar({ 
  onDateSelect, 
  initialStartDate = new Date(2025, 4, 16), 
  initialEndDate = new Date(2025, 4, 22) 
}) {
  const [currentYear] = useState(2025);
  const [startMonth, setStartMonth] = useState(4); // May (0-indexed)
  
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: initialStartDate,
    end: initialEndDate
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 
    'May', 'June', 'July', 'August', 
    'September', 'October', 'November', 'December'
  ];

  // Generate days for two months
  const monthOneCalendar = useMemo(() => 
    generateCalendarDays(currentYear, startMonth), 
    [currentYear, startMonth]
  );
  const monthTwoCalendar = useMemo(() => 
    generateCalendarDays(currentYear, startMonth + 1), 
    [currentYear, startMonth]
  );

  const handleDateSelection = (date) => {
    if (!selectedDateRange.start || selectedDateRange.end) {
      // Start a new range
      setSelectedDateRange({ start: date, end: null });
    } else {
      // Complete the range
      const newEnd = date >= selectedDateRange.start ? date : selectedDateRange.start;
      const newStart = date < selectedDateRange.start ? date : selectedDateRange.start;
      setSelectedDateRange({ start: newStart, end: newEnd });
    }
  };

  // Effect to call onDateSelect when date range changes
  useEffect(() => {
    if (selectedDateRange.start && selectedDateRange.end) {
      onDateSelect(selectedDateRange.start, selectedDateRange.end);
    }
  }, [selectedDateRange, onDateSelect]);

  const isDateSelected = (date) => {
    if (!date) return false;
    if (!selectedDateRange.start) return false;
    
    // Check if date is within range
    if (selectedDateRange.end) {
      return date >= selectedDateRange.start && date <= selectedDateRange.end;
    }
    
    return date.getTime() === selectedDateRange.start.getTime();
  };

  const renderCalendarMonth = (days, monthIndex) => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className={styles.calendarMonth}>
        <h3>{getMonthName(monthIndex)}</h3>
        <div className={styles.weekdayHeaders}>
          {weekdays.map(day => <div key={day}>{day}</div>)}
        </div>
        <div className={styles.dateGrid}>
          {days.map((day, index) => (
            <button 
              key={index}
              className={`
                ${day ? styles.dateButton : styles.emptyDateButton}
                ${day && isDateSelected(day) ? styles.selectedDate : ''}
              `}
              onClick={() => day && handleDateSelection(day)}
              disabled={!day}
            >
              {day ? day.getDate() : ''}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const handlePreviousMonth = () => {
    setStartMonth(prev => Math.max(0, prev - 1));
  };

  const handleNextMonth = () => {
    setStartMonth(prev => Math.min(11, prev + 1));
  };

  return (
    <div className={styles.expandedCalendarContainer}>
      <div className={styles.monthNavigation}>
        <button onClick={handlePreviousMonth}>{'<'}</button>
        <span>{`${getMonthName(startMonth)} - ${getMonthName(startMonth + 1)}`}</span>
        <button onClick={handleNextMonth}>{'>'}</button>
      </div>
      <div className={styles.multiMonthCalendar}>
        {renderCalendarMonth(monthOneCalendar, startMonth)}
        {renderCalendarMonth(monthTwoCalendar, startMonth + 1)}
      </div>
      <div className={styles.calendarSelectedDates}>
        <p>
          {selectedDateRange.start 
            ? `Start: ${selectedDateRange.start.toDateString()}` 
            : 'Select start date'}
        </p>
        <p>
          {selectedDateRange.end 
            ? `End: ${selectedDateRange.end.toDateString()}` 
            : 'Select end date'}
        </p>
      </div>
    </div>
  );
}