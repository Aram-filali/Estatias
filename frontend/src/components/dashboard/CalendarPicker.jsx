"use client";
import React, { useState } from 'react';
import { DateRangePicker } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { enGB } from 'date-fns/locale';

export const CalendarPicker = ({ onDateSelect }) => {
  const [range, setRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection',
  });

  const handleSelect = (ranges) => {
    setRange(ranges.selection); // Update the range state
    onDateSelect(ranges.selection); // Pass the selected range to the parent component
  };

  return (
    <DateRangePicker
      ranges={[range]}
      onChange={handleSelect}
      locale={enGB}
    />
  );
};
