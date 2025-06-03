import React, { useState, useEffect } from 'react';
import styles from './GuestSelector.module.css';

const GuestSelector = ({ 
  initialGuests = { adults: 1, children: 0, infants: 0 },
  onGuestsChange,
  maxGuests = 3,
  onClose 
}) => {
  // Initialize the local state with the provided values or default values
  const [guests, setGuests] = useState(initialGuests);

  // Update the parent state when guests change
  useEffect(() => {
    if (onGuestsChange) {
      onGuestsChange(guests);
    }
  }, [guests, onGuestsChange]);

  // Handle changes in the number of guests
  const handleGuestsChange = (type, action) => {
    const newGuests = { ...guests };
    
    if (action === 'add') {
      newGuests[type] += 1;
    } else if (action === 'remove') {
      newGuests[type] -= 1;
    }

    // Check constraints
    if (newGuests[type] < 0) {
      newGuests[type] = 0;
    }
    
    // For adults, at least 1 is required
    if (type === 'adults' && newGuests.adults < 1) {
      newGuests.adults = 1;
    }
    
    // Limit the total number of adults + children
    const totalNonInfants = newGuests.adults + newGuests.children;
    if (totalNonInfants > maxGuests) {
      // Revert to previous state if the limit is exceeded
      return;
    }
    
    // Limit the number of infants
    if (type === 'infants' && newGuests.infants > 5) {
      newGuests.infants = 5;
    }
    
    setGuests(newGuests);
  };

  // Calculate the total number of adults and children
  const totalNonInfants = guests.adults + guests.children;

  return (
    <div className={styles.guestSelector}>
      <p className={styles.guestInfo}>
        This accommodation can host up to {maxGuests} travelers, not including infants. 
        Pets are not allowed.
      </p>
      
      <div className={styles.guestRow}>
        <div className={styles.guestType}>
          <h3>Adults</h3>
          <p>13 years and older</p>
        </div>
        <div className={styles.guestCounter}>
          <button 
            onClick={() => handleGuestsChange('adults', 'remove')}
            disabled={guests.adults <= 1}
            className={guests.adults <= 1 ? styles.disabledButton : ''}
            aria-label="Decrease the number of adults"
          >
            -
          </button>
          <span>{guests.adults}</span>
          <button 
            onClick={() => handleGuestsChange('adults', 'add')}
            disabled={totalNonInfants >= maxGuests}
            className={totalNonInfants >= maxGuests ? styles.disabledButton : ''}
            aria-label="Increase the number of adults"
          >
            +
          </button>
        </div>
      </div>
      
      <div className={styles.guestRow}>
        <div className={styles.guestType}>
          <h3>Children</h3>
          <p>2 to 12 years old</p>
        </div>
        <div className={styles.guestCounter}>
          <button 
            onClick={() => handleGuestsChange('children', 'remove')}
            disabled={guests.children <= 0}
            className={guests.children <= 0 ? styles.disabledButton : ''}
            aria-label="Decrease the number of children"
          >
            -
          </button>
          <span>{guests.children}</span>
          <button 
            onClick={() => handleGuestsChange('children', 'add')}
            disabled={totalNonInfants >= maxGuests}
            className={totalNonInfants >= maxGuests ? styles.disabledButton : ''}
            aria-label="Increase the number of children"
          >
            +
          </button>
        </div>
      </div>
      
      <div className={styles.guestRow}>
        <div className={styles.guestType}>
          <h3>Infants</h3>
          <p>Under 2 years old</p>
        </div>
        <div className={styles.guestCounter}>
          <button 
            onClick={() => handleGuestsChange('infants', 'remove')}
            disabled={guests.infants <= 0}
            className={guests.infants <= 0 ? styles.disabledButton : ''}
            aria-label="Decrease the number of infants"
          >
            -
          </button>
          <span>{guests.infants}</span>
          <button 
            onClick={() => handleGuestsChange('infants', 'add')}
            disabled={guests.infants >= 5}
            className={guests.infants >= 5 ? styles.disabledButton : ''}
            aria-label="Increase the number of infants"
          >
            +
          </button>
        </div>
      </div>
      
      <div className={styles.guestSummary}>
        <p>
          {totalNonInfants} {totalNonInfants <= 1 ? 'traveler' : 'travelers'}
          {guests.infants > 0 ? `, ${guests.infants} ${guests.infants <= 1 ? 'infant' : 'infants'}` : ''}
        </p>
      </div>
      
      <div className={styles.calendarActions}>
        <div></div>
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

export default GuestSelector;
