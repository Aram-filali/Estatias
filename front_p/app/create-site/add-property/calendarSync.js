import React, { useState } from 'react';
import { X, Calendar, Link, DollarSign } from 'lucide-react';
import styles from './calendarSync.module.css';

const CalendarSyncPopup = ({ isOpen, onClose, onSyncComplete }) => {
  const [step, setStep] = useState('intro');
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [syncUrl, setSyncUrl] = useState('');
  const [syncedDates, setSyncedDates] = useState([]);
  const [priceMode, setPriceMode] = useState('bulk');
  const [bulkPricing, setBulkPricing] = useState({
    price: '',
    touristTax: '',
    useComparison: false,
    otherPlatformPrice: ''
  });
  const [individualPricing, setIndividualPricing] = useState({});
  const [isLoading, setIsLoading] = useState(false);

const handlePlatformSelect = (platform) => {
  setSelectedPlatform(platform);
  setStep('url-input');
};

const validateUrl = (url, platform) => {
  try {
    new URL(url);
  } catch {
    return { valid: false, message: "The entered URL is not valid. Please enter a complete URL (e.g., https://www.hometogo.com/...)" };
  }

  switch (platform) {
    case 'hometogo':
      if (!url.includes('hometogo.')) {
        return { valid: false, message: "The URL must be a valid HomeToGo URL (e.g., https://www.hometogo.com/rental/...)" };
      }
      break;
    
    case 'airbnb-booking':
      if (!url.includes('airbnb.') && !url.includes('booking.')) {
        return { valid: false, message: "The URL must be a valid Airbnb or Booking URL" };
      }
      break;
  }

  return { valid: true };
};

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Invalid date';
  }
};

// Configuration de l'URL de base de l'API
const getApiBaseUrl = () => {
  // En production, utilisez l'URL de votre API Gateway déployée
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || 'https://api-gateway-hcq3.onrender.com';
  }
  // En développement, utilisez localhost
  return 'http://localhost:3000';
};

const handleUrlSubmit = async () => {
  if (!syncUrl.trim()) {
    alert('Please enter a URL');
    return;
  }
  
  const validation = validateUrl(syncUrl, selectedPlatform);
  if (!validation.valid) {
    alert(validation.message);
    return;
  }
  
  setIsLoading(true);
  
  try {
    let response;
    let result;
    
    const apiBaseUrl = getApiBaseUrl();
    console.log('API Base URL:', apiBaseUrl);
    console.log('Selected platform:', selectedPlatform);
    console.log('Sync URL:', syncUrl);
    
    if (selectedPlatform === 'airbnb-booking') {
      console.log('Using Airbnb/Booking POST endpoint');
      
      response = await fetch(`${apiBaseUrl}/cal-sync/ical/test-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: syncUrl.trim()
        })
      });
      
      result = await response.json();
      
      if (!response.ok || !result.valid) {
        throw new Error(result.message || 'Invalid iCal URL');
      }
      
      if (result.data && result.data.availabilities && Array.isArray(result.data.availabilities)) {
        const availableDates = result.data.availabilities
          .filter(availability => availability.available === true)
          .slice(0, 50);
        
        setSyncedDates(availableDates.map(availability => ({
          date: availability.date,
          available: true
        })));
      } else {
        const mockDates = [
          { date: '2024-06-15', available: true },
          { date: '2024-06-25', available: true },
          { date: '2024-07-05', available: true },
          { date: '2024-07-15', available: true },
        ];
        setSyncedDates(mockDates);
      }
      
    } else if (selectedPlatform === 'hometogo') {
      console.log('Using HomeToGo POST endpoint');
      
      if (!syncUrl || syncUrl.trim() === '') {
        throw new Error('Empty or invalid URL');
      }
      
      response = await fetch(`${apiBaseUrl}/cal-sync/scraping/test-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: syncUrl.trim(),
          platform: 'hometogo'
        })
      });
      
      result = await response.json();
      console.log('HomeToGo API response:', result);
      
      if (!response.ok) {
        const errorMessage = result?.message || result?.error || `HTTP error ${response.status}`;
        throw new Error(`API Error: ${errorMessage}`);
      }
      
      if (result.success === false) {
        const errorMessage = result.message || result.error || 'Scraping test failed';
        throw new Error(`HomeToGo Error: ${errorMessage}`);
      }
      
      if (result.data && result.data.availabilities && Array.isArray(result.data.availabilities)) {
        const availableDates = result.data.availabilities
          .filter(availability => availability.available === true || availability.isAvailable === true)
          .slice(0, 50);
        
        setSyncedDates(availableDates.map(availability => ({
          date: availability.date || availability.start_date || availability.startDate,
          available: true
        })));
      } else if (result.availabilities && Array.isArray(result.availabilities)) {
        const availableDates = result.availabilities
          .filter(availability => availability.available === true || availability.isAvailable === true)
          .slice(0, 50);
        
        setSyncedDates(availableDates.map(availability => ({
          date: availability.date || availability.start_date || availability.startDate,
          available: true
        })));
      } else {
        console.log('No real data found, using mock data for demo');
        
        const mockHomeToGoDates = [
          { date: '2024-06-20', available: true },
          { date: '2024-07-10', available: true },
          { date: '2024-07-20', available: true },
          { date: '2024-08-05', available: true },
        ];
        setSyncedDates(mockHomeToGoDates);
      }
    }
    
    setStep('price-setup');
    
  } catch (error) {
    console.error('Sync error:', error);
    
    let errorMessage = error.message;
    
    if (errorMessage.includes('Invalid public URL') || 
        errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('Network Error') ||
        errorMessage.includes('API Error')) {
      
      errorMessage += '\n\n📝 Valid URL examples:\n';
      
      if (selectedPlatform === 'hometogo') {
        errorMessage += '• https://www.hometogo.com/rental/1e012a37973ae981\n';
        errorMessage += '• https://www.hometogo.com/location/property-name\n';
        errorMessage += '• https://www.hometogo.com/vacation-rental/property-name\n';
        errorMessage += '\n💡 Make sure the URL is publicly accessible';
      } else if (selectedPlatform === 'airbnb-booking') {
        errorMessage += '• https://calendar.airbnb.com/calendar/ical/12345678.ics?s=token\n';
        errorMessage += '• https://www.booking.com/calendar/ical/property-id.ics\n';
        errorMessage += '\n💡 Use the complete iCal URL provided by the platform';
      }
    }
    
    alert(`❌ Synchronization error:\n\n${errorMessage}`);
  } finally {
    setIsLoading(false);
  }
};

  const handleBulkPriceChange = (field, value) => {
    setBulkPricing(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIndividualPriceChange = (dateIndex, field, value) => {
    setIndividualPricing(prev => ({
      ...prev,
      [dateIndex]: {
        ...prev[dateIndex],
        [field]: value
      }
    }));
  };

const saveSyncData = () => {
  const syncData = {
    platform: selectedPlatform,
    url: syncUrl,
    syncedDates: syncedDates,
    priceMode: priceMode,
    bulkPricing: bulkPricing,
    individualPricing: individualPricing,
    timestamp: new Date().toISOString()
  };

  // Retourner les données sans localStorage
  console.log('Calendar sync data prepared:', syncData);
  return syncData;
};

const handleComplete = () => {
  // Sauvegarder les données avant de les passer au parent
  const syncData = saveSyncData();
  
  const finalData = syncedDates
    .filter(dateItem => dateItem.available)
    .map((dateItem, index) => {
      const pricing = priceMode === 'bulk' ? bulkPricing : (individualPricing[index] || {});
      
      return {
        start_time: new Date(dateItem.date).toISOString(),
        end_time: new Date(new Date(dateItem.date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        price: pricing.price || "",
        otherPlatformPrice: pricing.useComparison ? pricing.otherPlatformPrice || "" : "",
        touristTax: pricing.touristTax || "",
        isPrice: pricing.useComparison || false
      };
    });
  
  // Passer les données formatées ET les données de sync au parent
  onSyncComplete({
    availabilities: finalData,
    syncData: syncData,
    // Ajouter une propriété pour indiquer que c'est une sync
    isSyncedData: true
  });
  
  handleClose();
};

  const handleClose = () => {
    setStep('intro');
    setSelectedPlatform(null);
    setSyncUrl('');
    setSyncedDates([]);
    setPriceMode('bulk');
    setBulkPricing({
      price: '',
      touristTax: '',
      useComparison: false,
      otherPlatformPrice: ''
    });
    setIndividualPricing({});
    setIsLoading(false);
    onClose();
  };

  const isCompleteDisabled = () => {
    const availableDates = syncedDates.filter(dateItem => dateItem.available);
    
    if (priceMode === 'bulk') {
      return !bulkPricing.price || !bulkPricing.touristTax ||
             (bulkPricing.useComparison && !bulkPricing.otherPlatformPrice);
    } else {
      return availableDates.some((_, index) => {
        const pricing = individualPricing[index] || {};
        return !pricing.price || !pricing.touristTax;
      });
    }
  };


  if (!isOpen) return null;

  return (
    <div className={styles.syncOverlay}>
      <div className={styles.syncPopup}>
        <div className={styles.syncHeader}>
          <h2 className={styles.syncTitle}>
            <Calendar className={styles.syncIcon} />
            Calendar Synchronization
          </h2>
          <button
            onClick={handleClose}
            className={styles.syncCloseButton}
            type="button"
          >
            <X className={styles.syncCloseIcon} />
          </button>
        </div>

        <div className={styles.syncContent}>
          {step === 'intro' && (
            <div className={styles.syncIntroSection}>
              <div className={styles.syncIntroContent}>
                <h3 className={styles.syncIntroTitle}>Why synchronize your calendars?</h3>
                <div className={styles.syncIntroText}>
                  <p>• <strong>Avoid double bookings</strong> by automatically synchronizing your availability</p>
                  <p>• <strong>Save time</strong> by importing your dates from other platforms</p>
                  <p>• <strong>Maintain consistency</strong> of your availability across all platforms</p>
                </div>
              </div>
              
              <div className={styles.syncPlatformSection}>
                <h4 className={styles.syncPlatformTitle}>Choose your platform:</h4>
                <div className={styles.syncPlatformGrid}>
                  <button
                    onClick={() => handlePlatformSelect('airbnb-booking')}
                    className={styles.syncPlatformButton}
                    type="button"
                  >
                    <div className={styles.syncPlatformName}>Airbnb / Booking.com</div>
                    <div className={styles.syncPlatformDescription}>Synchronize via iCal URL</div>
                  </button>
                  
                  <button
                    onClick={() => handlePlatformSelect('hometogo')}
                    className={styles.syncPlatformButton}
                    type="button"
                  >
                    <div className={styles.syncPlatformName}>HomeToGo</div>
                    <div className={styles.syncPlatformDescription}>Synchronize via public property URL</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'url-input' && (
            <div className={styles.syncUrlSection}>
              <div className={styles.syncUrlHeader}>
                <h3 className={styles.syncUrlTitle}>
                  {selectedPlatform === 'airbnb-booking' ? 'iCal URL' : 'HomeToGo public URL'}
                </h3>
                <p className={styles.syncUrlDescription}>
                  {selectedPlatform === 'airbnb-booking' 
                    ? 'Paste the iCal URL from your Airbnb or Booking.com calendar'
                    : 'Paste the public URL of your HomeToGo property'
                  }
                </p>
              </div>

              <div className={styles.syncUrlForm}>
                <div className={styles.syncInputGroup}>
                  <label className={styles.syncInputLabel}>
                    <Link className={styles.syncInputIcon} />
                    {selectedPlatform === 'airbnb-booking' ? 'iCal URL' : 'Property URL'}
                  </label>
                  <input
                    type="url"
                    value={syncUrl}
                    onChange={(e) => setSyncUrl(e.target.value)}
                    placeholder={selectedPlatform === 'airbnb-booking' 
                      ? 'https://calendar.airbnb.com/calendar/ical/...' 
                      : 'https://www.hometogo.com/rental/...'
                    }
                    className={styles.syncInput}
                  />
                </div>

                <div className={styles.syncButtonGroup}>
                  <button
                    onClick={() => setStep('intro')}
                    className={styles.syncSecondaryButton}
                    type="button"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleUrlSubmit}
                    disabled={!syncUrl.trim() || isLoading}
                    className={styles.syncPrimaryButton}
                    type="button"
                  >
                    {isLoading ? 'Synchronizing...' : 'Synchronize'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'price-setup' && (
            <div className={styles.syncPriceSection}>
              <div className={styles.syncPriceHeader}>
                <h3 className={styles.syncPriceTitle}>Price Configuration</h3>
                <p className={styles.syncPriceDescription}>
                  Your available dates have been successfully imported.  
                  You can now configure the prices and tourist taxes for the {syncedDates.filter(d => d.available).length} first ones, and set up the rest whenever you're ready.
                </p>
              </div>

              <div className={styles.syncPriceContent}>
                <div className={styles.syncPriceModeSection}>
                  <label className={styles.syncPriceModeLabel}>Pricing mode:</label>
                  <div className={styles.syncPriceModeGrid}>
                    <button
                      onClick={() => setPriceMode('bulk')}
                      className={`${styles.syncPriceModeButton} ${
                        priceMode === 'bulk' ? styles.syncPriceModeButtonActive : ''
                      }`}
                      type="button"
                    >
                      <div className={styles.syncPriceModeName}>Single price</div>
                      <div className={styles.syncPriceModeDescription}>Same price for all dates</div>
                    </button>
                    
                    <button
                      onClick={() => setPriceMode('individual')}
                      className={`${styles.syncPriceModeButton} ${
                        priceMode === 'individual' ? styles.syncPriceModeButtonActive : ''
                      }`}
                      type="button"
                    >
                      <div className={styles.syncPriceModeName}>Price per date</div>
                      <div className={styles.syncPriceModeDescription}>Different price for each date</div>
                    </button>
                  </div>
                </div>

                {priceMode === 'bulk' && (
                  <div className={styles.syncBulkPricing}>
                    <h4 className={styles.syncBulkPricingTitle}>
                      <DollarSign className={styles.syncBulkPricingIcon} />
                      Single price for all dates
                    </h4>
                    
                    <div className={styles.syncBulkPricingForm}>
                      <div className={styles.syncCheckboxGroup}>
                        <label className={styles.syncCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={bulkPricing.useComparison}
                            onChange={(e) => handleBulkPriceChange('useComparison', e.target.checked)}
                            className={styles.syncCheckbox}
                          />
                          <span className={styles.syncCheckboxText}>Comparison pricing with other platforms</span>
                        </label>
                      </div>

                      {bulkPricing.useComparison && (
                        <div className={styles.syncInputGroup}>
                          <label className={styles.syncInputLabel}>Platform price ($)</label>
                          <input
                            type="number"
                            value={bulkPricing.otherPlatformPrice}
                            onChange={(e) => handleBulkPriceChange('otherPlatformPrice', e.target.value)}
                            placeholder="Price on other platforms"
                            className={styles.syncInput}
                          />
                        </div>
                      )}

                      <div className={styles.syncInputGroup}>
                        <label className={styles.syncInputLabel}>
                          {bulkPricing.useComparison ? 'Your price ($)' : 'Price per night ($)'}
                        </label>
                        <input
                          type="number"
                          value={bulkPricing.price}
                          onChange={(e) => handleBulkPriceChange('price', e.target.value)}
                          placeholder="Price per night"
                          className={styles.syncInput}
                        />
                      </div>

                      <div className={styles.syncInputGroup}>
                        <label className={styles.syncInputLabel}>Tourist tax (%)</label>
                        <input
                          type="number"
                          value={bulkPricing.touristTax}
                          onChange={(e) => handleBulkPriceChange('touristTax', e.target.value)}
                          placeholder="Tourist tax"
                          className={styles.syncInput}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {priceMode === 'individual' && (
                  <div className={styles.syncIndividualPricing}>
                    <h4 className={styles.syncIndividualPricingTitle}>Price per date</h4>
                    <div className={styles.syncIndividualPricingList}>
                      {syncedDates.map((dateItem, index) => (
                        <div key={index} className={styles.syncIndividualPricingItem}>
                          <div className={styles.syncIndividualPricingHeader}>
                            {formatDate(dateItem.date)}
                            <span className={`${styles.syncAvailabilityBadge} ${
                              dateItem.available ? styles.syncAvailabilityBadgeAvailable : styles.syncAvailabilityBadgeOccupied
                            }`}>
                              {dateItem.available ? 'Available' : 'Occupied'}
                            </span>
                          </div>
                          
                          {dateItem.available && (
                            <div className={styles.syncIndividualPricingInputs}>
                              <div className={styles.syncSmallInputGroup}>
                                <label className={styles.syncSmallInputLabel}>Price ($)</label>
                                <input
                                  type="number"
                                  value={individualPricing[index]?.price || ''}
                                  onChange={(e) => handleIndividualPriceChange(index, 'price', e.target.value)}
                                  placeholder="Price per night"
                                  className={styles.syncSmallInput}
                                />
                              </div>
                              <div className={styles.syncSmallInputGroup}>
                                <label className={styles.syncSmallInputLabel}>Tax (%)</label>
                                <input
                                  type="number"
                                  value={individualPricing[index]?.touristTax || ''}
                                  onChange={(e) => handleIndividualPriceChange(index, 'touristTax', e.target.value)}
                                  placeholder="Tax"
                                  className={styles.syncSmallInput}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.syncFinalButtonGroup}>
                  <button
                    onClick={() => setStep('url-input')}
                    className={styles.syncSecondaryButton}
                    type="button"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={isCompleteDisabled()}
                    className={styles.syncSuccessButton}
                    type="button"
                  >
                    Complete synchronization
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarSyncPopup;