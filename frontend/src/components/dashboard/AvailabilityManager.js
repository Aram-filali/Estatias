import React, { useState, useEffect } from 'react';
import { IoCalendarOutline } from 'react-icons/io5';
import DateSelector from './DateSelector';
import CalendarSyncPopup from './calendarSync';
import styles from './availabilityManager.module.css';

const AvailabilityManager = ({ onAvailabilitiesChange, initialAvailabilities = [] }) => {
  const [availabilities, setAvailabilities] = useState(initialAvailabilities || []);
  const [selectedSetupMethod, setSelectedSetupMethod] = useState('manual');
  const [currentAvailability, setCurrentAvailability] = useState({
    start_time: "",
    end_time: "",
    price: "",
    otherPlatformPrice: "",
    touristTax: "",
    isPrice: false, 
  });

  const [errors, setErrors] = useState({
    start_time: "",
    end_time: "",
    price: "",
    otherPlatformPrice: "",
    touristTax: "",
  });

  const [touched, setTouched] = useState({
    start_time: false,
    end_time: false,
    price: false,
    otherPlatformPrice: false,
    touristTax: false,
  });

  const [useComparisonPricing, setUseComparisonPricing] = useState(false);
  
  // État pour gérer l'affichage de la popup de synchronisation
  const [showCalendarSyncPopup, setShowCalendarSyncPopup] = useState(false);

  useEffect(() => {
    const newErrors = {};
    Object.keys(currentAvailability).forEach(key => {
      newErrors[key] = validateAvailability(key, currentAvailability[key]);
    });
    setErrors(newErrors);
  }, [currentAvailability]);

  useEffect(() => {
    console.log("Current availabilities:", availabilities);
    if (onAvailabilitiesChange) {
      onAvailabilitiesChange(availabilities);
    }
  }, [availabilities, onAvailabilitiesChange]);

  useEffect(() => {
    // Mettre à jour isPlace lorsque le toggle change
    setCurrentAvailability(prevData => ({
      ...prevData,
      isPrice: useComparisonPricing,
    }));
  }, [useComparisonPricing]);

  const handleAvailabilityChange = (e) => {
    const { name, value } = e.target;
    setCurrentAvailability((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (!touched[name]) {
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  };

  const handleToggleComparisonPricing = () => {
    const newUseComparisonPricing = !useComparisonPricing;
    setUseComparisonPricing(newUseComparisonPricing);
    
    setCurrentAvailability(prev => ({
      ...prev,
      isPrice: newUseComparisonPricing,
      otherPlatformPrice: newUseComparisonPricing ? prev.price : ""
    }));
  };

  const handleAddAvailability = () => {
    setTouched({
      start_time: true,
      end_time: true,
      price: true,
      otherPlatformPrice: useComparisonPricing,
      touristTax: true,
    });

    if (!currentAvailability.start_time ||
        !currentAvailability.end_time ||
        !currentAvailability.price) {
      return;
    }

    const start = new Date(currentAvailability.start_time);
    const end = new Date(currentAvailability.end_time);

    if (start >= end) {
      setErrors(prev => ({
        ...prev,
        end_time: "End date must be after start date"
      }));
      return;
    }

    const isOverlapping = availabilities.some(avail => {
      const availStart = new Date(avail.start_time);
      const availEnd = new Date(avail.end_time);

      return (
        (start >= availStart && start < availEnd) ||
        (end > availStart && end <= availEnd) ||
        (start <= availStart && end >= availEnd)
      );
    });

    if (isOverlapping) {
      alert("This period overlaps with an existing availability. Please choose different dates.");
      return;
    }

    const availabilityToAdd = { 
      ...currentAvailability,
      isPrice: useComparisonPricing
    };
    
    if (!useComparisonPricing) {
      delete availabilityToAdd.otherPlatformPrice;
    }

    setAvailabilities((prevAvailabilities) => [
      ...prevAvailabilities,
      availabilityToAdd
    ]);

    setCurrentAvailability({
      start_time: "",
      end_time: "",
      price: "",
      otherPlatformPrice: "",
      touristTax: "",
      isPrice: useComparisonPricing
    });

    setTouched({
      start_time: false,
      end_time: false,
      price: false,
      otherPlatformPrice: false,
      touristTax: false,
    });
  };

  const handleDateSelect = ({ startDate, endDate }) => {
    if (!startDate || !endDate) {
      setCurrentAvailability(prevData => ({
        ...prevData,
        start_time: "",
        end_time: "",
      }));
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      setErrors(prev => ({
        ...prev,
        end_time: "End date must be after start date"
      }));
      return;
    }

    const start_time = new Date(start.setHours(0, 0, 0, 0)).toISOString();
    const end_time = new Date(end.setHours(23, 59, 59, 999)).toISOString();

    setCurrentAvailability(prevData => ({
      ...prevData,
      start_time,
      end_time,
    }));

    setTouched(prev => ({
      ...prev,
      start_time: true,
      end_time: true
    }));
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'Select dates';
  };

  const validateAvailability = (name, value) => {
    switch (name) {
      case 'start_time':
        return !value ? "date is required" : "";
      case 'end_time':
        if (!value) return " date is required";
        if (value && currentAvailability.start_time &&
          new Date(value) <= new Date(currentAvailability.start_time)) {
          return "End date must be after start date";
        }
        return "";
      case 'price':
        if (!value) return "Price is required";
        if (isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
          return "Price must be a positive number";
        }
        if (useComparisonPricing && 
            currentAvailability.otherPlatformPrice && 
            parseFloat(value) >= parseFloat(currentAvailability.otherPlatformPrice)) {
          return "Your price must be lower than the platform price";
        }
        return "";
      case 'otherPlatformPrice':
        if (useComparisonPricing && !value) return "Platform price is required";
        if (value && (isNaN(parseFloat(value)) || parseFloat(value) <= 0)) {
          return "Platform price must be a positive number";
        }
        if (useComparisonPricing && 
            currentAvailability.price && 
            parseFloat(value) <= parseFloat(currentAvailability.price)) {
          return "Platform price must be higher than your price";
        }
        return "";
      case 'touristTax':
        if (!value) return "Tourist tax is required";
        if (value && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
          return "Tourist tax must be a non-negative number";
        }
        return "";
      default:
        return "";
    }
  };

  const handleRemoveAvailability = (index) => {
    const newAvailabilities = [...availabilities];
    newAvailabilities.splice(index, 1);
    setAvailabilities(newAvailabilities);
  };

  const isAddButtonDisabled = () => {
    const startDate = currentAvailability.start_time ? new Date(currentAvailability.start_time) : null;
    const endDate = currentAvailability.end_time ? new Date(currentAvailability.end_time) : null;

    if (startDate && endDate && startDate >= endDate) {
      return true;
    }

    const fieldsToCheck = ['start_time', 'end_time', 'price', 'touristTax'];
    if (useComparisonPricing) {
      fieldsToCheck.push('otherPlatformPrice');
    }

    return fieldsToCheck.some(field => !currentAvailability[field]) ||
      Object.entries(errors).some(([key, error]) => fieldsToCheck.includes(key) && error !== "");
  };

  const shouldShowError = (fieldName) => {
    return touched[fieldName] && errors[fieldName];
  };

  // Fonction pour ouvrir la popup de synchronisation
  const handleSynchronizeWithPlatforms = (e) => {
    // Empêcher la soumission du formulaire
    e.preventDefault();
    e.stopPropagation();
    setShowCalendarSyncPopup(true);
  };

  // Fonction pour fermer la popup de synchronisation
  const handleCloseCalendarSync = () => {
    setShowCalendarSyncPopup(false);
  };

  // Fonction pour gérer la synchronisation réussie
const handleSyncSuccess = (syncedData) => {
  // Traiter les données synchronisées
  console.log("Synchronized data:", syncedData);
  
  // Vérifier si nous avons des données valides
  if (syncedData && syncedData.availabilities && syncedData.availabilities.length > 0) {
    // Les données sont déjà dans le bon format depuis CalendarSyncPopup
    const formattedAvailabilities = syncedData.availabilities.map(item => ({
      start_time: item.start_time,
      end_time: item.end_time,
      price: item.price,
      otherPlatformPrice: item.otherPlatformPrice,
      touristTax: item.touristTax,
      isPrice: item.isPrice
    }));
    
    // Ajouter les nouvelles disponibilités synchronisées
    setAvailabilities(prevAvailabilities => [
      ...prevAvailabilities,
      ...formattedAvailabilities
    ]);
    
    console.log("Added availabilities:", formattedAvailabilities);
  } else {
    console.log("No availabilities to add");
  }
  
  // Fermer la popup
  setShowCalendarSyncPopup(false);
};

  return (
    <section className={styles.availManagerSection}>
      <h2>2. Property Availability</h2>

      {/* Container de sélection d'availability */}
      <div className={styles.availabilitySetupContainer}>
        <h3 className={styles.availabilitySetupTitle}>How would you like to set up your availability?</h3>
        
        <div className={styles.availabilitySetupOptions}>
          <div 
            className={`${styles.availabilitySetupOption} ${selectedSetupMethod === 'manual' ? styles.availabilitySetupOptionActive : ''}`}
            onClick={() => setSelectedSetupMethod('manual')}
          >
            <div className={styles.availabilitySetupOptionIcon}>📅</div>
            <div className={styles.availabilitySetupOptionContent}>
              <h4 className={styles.availabilitySetupOptionTitle}>Manual Calendar Setup</h4>
              <p className={styles.availabilitySetupOptionDescription}>
                Perfect for new hosts or those who prefer manual control. Set your dates and prices directly using our calendar.
              </p>
              <div className={styles.availabilitySetupOptionStatus}>
                ✓ Active - Use the calendar below
              </div>
            </div>
          </div>

          <div 
            className={`${styles.availabilitySetupOption} ${selectedSetupMethod === 'import' ? styles.availabilitySetupOptionActive : ''}`}
            onClick={() => setSelectedSetupMethod('import')}
          >
            <div className={styles.availabilitySetupOptionIcon}>🔄</div>
            <div className={styles.availabilitySetupOptionContent}>
              <h4 className={styles.availabilitySetupOptionTitle}>Import from Other Platforms</h4>
              <p className={styles.availabilitySetupOptionDescription}>
                Already hosting on Airbnb, Booking.com, or HomeToGo? Import your existing calendar to save time.
              </p>
              <button 
                type="button"
                className={styles.availabilitySetupSyncButton}
                onClick={handleSynchronizeWithPlatforms}
              >
                📅 Synchronize with other platforms
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendrier manuel toujours affiché */}
      <div className={styles.availManagerContainer}>
        <div className={styles.availManagerCalendarSection}>
          <DateSelector
            onDateSelect={handleDateSelect}
            onBlur={handleBlur}
            initialStartDate={currentAvailability.start_time ? new Date(currentAvailability.start_time) : null}
            initialEndDate={currentAvailability.end_time ? new Date(currentAvailability.end_time) : null}
            alwaysVisible={true}
          />
        </div>

        <div className={styles.availManagerPriceSection}>
          <div className={styles.availManagerDateDisplay}>
            <div className={styles.availManagerSelectedDates}>
              <IoCalendarOutline />
              {currentAvailability.start_time
                ? `${formatDate(currentAvailability.start_time)} to ${formatDate(currentAvailability.end_time)}`
                : 'Select dates'}
              {shouldShowError('end_time') &&
                <span className="error">{errors.end_time}</span>}
            </div>
          </div>

          <section className={styles.availManagerSection}>
            <div className={styles.availManagerPricingInputs}>
              <h2>Price and Taxes</h2>
              
              <div className={styles.availManagerToggleContainer}>
                <span className={styles.availManagerToggleLabel}>
                  Please choose a price lower than the one listed on other platforms (e.g., Airbnb, Booking.com)
                </span>
                <label className={styles.availManagerToggleSwitch}>
                  <input
                    type="checkbox"
                    checked={useComparisonPricing}
                    onChange={handleToggleComparisonPricing}
                    onBlur={handleBlur}
                  />
                  <span className={styles.availManagerToggleSlider}></span>
                </label>
              </div>

              {useComparisonPricing ? (
                <>
                  <div className={styles.availManagerInputGroup}>
                    <label className={styles.label}>
                      Platform price <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Platform price ($)"
                      name="otherPlatformPrice"
                      value={currentAvailability.otherPlatformPrice}
                      onChange={handleAvailabilityChange}
                      onBlur={handleBlur}
                      className={styles.availManagerFullWidthInput}
                    />
                    {shouldShowError('otherPlatformPrice') && 
                      <span className={styles.availManagerError}>{errors.otherPlatformPrice}</span>}
                  </div>

                  <div className={styles.availManagerInputGroup}>
                    <label className={styles.label}>
                      Your price <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Your price ($)"
                      name="price"
                      value={currentAvailability.price}
                      onChange={handleAvailabilityChange}
                      onBlur={handleBlur}
                      className={styles.availManagerFullWidthInput}
                    />
                    {shouldShowError('price') && <span className={styles.availManagerError}>{errors.price}</span>}
                  </div>
                </>
              ) : (
                <div className={styles.availManagerInputGroup}>
                  <label className={styles.label}>
                    Price <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Price per night ($)"
                    name="price"
                    value={currentAvailability.price}
                    onChange={handleAvailabilityChange}
                    onBlur={handleBlur}
                    className={styles.availManagerFullWidthInput}
                  />
                  {shouldShowError('price') && <span className={styles.availManagerError}>{errors.price}</span>}
                </div>
              )}

              <div className={styles.availManagerInputGroup}>
                <label className={styles.label}>
                  Tourist tax <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  placeholder="Tourist tax (%)"
                  name="touristTax"
                  value={currentAvailability.touristTax}
                  onChange={handleAvailabilityChange}
                  onBlur={handleBlur}
                  className={styles.availManagerFullWidthInput}
                />
                {shouldShowError('touristTax') && <span className={styles.availManagerError}>{errors.touristTax}</span>}
              </div>
            </div>
          </section>

          <button
            type="button"
            className={styles.availManagerAddButton}
            onClick={handleAddAvailability}
            disabled={isAddButtonDisabled()}
          >
            Add Availability
          </button>
        </div>
      </div>

      {availabilities.length > 0 && (
        <div className={styles.availManagerList}>
          <h3>Added Availabilities</h3>
          <ul>
            {availabilities.map((avail, index) => (
              <li key={index} className={styles.availManagerListItem}>
                <div>
                  {formatDate(avail.start_time)} to {formatDate(avail.end_time)} - {avail.price}$/night
                  {avail.otherPlatformPrice && ` (Other platform price: ${avail.otherPlatformPrice}$)`}
                  {avail.touristTax && ` (Tax: ${avail.touristTax}%)`}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAvailability(index)}
                  className={styles.availManagerRemoveButton}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Popup de synchronisation des calendriers */}
      <CalendarSyncPopup
        isOpen={showCalendarSyncPopup}
        onClose={handleCloseCalendarSync}
        onSyncComplete={handleSyncSuccess}
      />
    </section>
  );
};

export default AvailabilityManager;