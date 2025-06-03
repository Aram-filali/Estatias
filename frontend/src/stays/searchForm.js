import { useState } from 'react';

const SearchForm = ({ checkInDate, setCheckInDate, checkOutDate, setCheckOutDate, guestCount, setGuestCount, handleCheckInFocus, handleCheckOutFocus, renderCalendar }) => {
  return (
    <div className="search-form-container">
      <div className="booking-form">
        <div className="booking-field">
          <label>Check-out Date</label>
          <input
            type="text"
            placeholder="Ajouter des dates"
            value={checkInDate || ''}
            onClick={handleCheckInFocus}
            readOnly
          />
          {renderCalendar(true)}
        </div>

        <div className="booking-field">
          <label>Chech-in Date</label>
          <input
            type="text"
            placeholder="Ajouter des dates"
            value={checkOutDate || ''}
            onClick={handleCheckOutFocus}
            readOnly
          />
          {renderCalendar(false)}
        </div>

        <div className="booking-field">
          <label>Guests</label>
          <div className="guest-selector">
            <div className="guest-count">{guestCount} Guest{guestCount > 1 ? 's' : ''}</div>
            <div className="guest-buttons">
              <button
                onClick={() => setGuestCount(prev => Math.max(1, prev - 1))}
                disabled={guestCount <= 1}
              >
                -
              </button>
              <button
                onClick={() => setGuestCount(prev => prev + 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button className="search-button">
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchForm;
