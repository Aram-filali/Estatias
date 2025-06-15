import React from 'react';
import styles from './SideBar.module.css';
import { format, parseISO, addDays } from 'date-fns';

const Sidebar = ({ 
  property, 
  selectedDates, 
  guests, 
  calculateNights, 
  pricing,
  nightlyRate,
  subtotal,
  touristTax,
  serviceFee,
  nights,
  onDateEdit, 
  onGuestsEdit 
}) => {
  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  // Use query param values if available, otherwise calculate
  const priceDetails = {
    nightlyRate: nightlyRate || '0',
    subtotal: subtotal || '0',
    taxAmount: touristTax || '0',
    serviceCharge: serviceFee || '0',
    total: pricing.total.toFixed(2) || '0',
    deposit: (pricing.total * 0.46).toFixed(2) || '0',
    remaining: (pricing.total * 0.54).toFixed(2) || '0'
  };

  // Get the property image
  const propertyImage = 
    property?.mainPhotos && property.mainPhotos.length > 0 
      ? property.mainPhotos[0] 
      : '/luxury-luxury.webp'; // Fallback image

  return (
    <div className={styles.sidebarContainer}>
      <div className={styles.propertySidebar}>
        <div className={styles.propertyHeader}>
          <div className={styles.propertyImage}>
            <img 
              src={propertyImage} 
              alt={property?.title || "Property Image"} 
              className={styles.propertyImage}
            />
          </div>
          <div className={styles.propertyInfo}>
            <h3>{property?.title || "Property Title"}</h3>
            <div className={styles.rating}>
              <span>★</span>
              <span>{property?.rating || "N/A"} ({property?.reviews?.length || 0})</span>
            </div>
           {property?.policies?.cancellation_policy && (() => {
            const policy = property.policies.cancellation_policy;
            let title = '';
            let details = '';

            if (policy.startsWith('Moderate -')) {
              title = 'Moderate';
              details = 'Full refund 5 days prior to arrival';
            } else if (policy.startsWith('Flexible -')) {
              title = 'Flexible';
              details = 'Full refund 1 day prior to arrival';
            } else if (policy.startsWith('Strict -')) {
              title = 'Strict';
              details = '50% refund until 1 week prior to arrival';
            } else if (policy === 'Non-refundable') {
              title = 'Non-refundable';
              details = 'No refunding is possible';
            } else {
              title = 'Cancellation Policy';
              details = policy;
            }

            return (
              <>
                <p className={styles.cancellationText}>{title}</p>
                <p className={styles.cancellationDetails}>{details}</p>
              </>
            );
          })()}

          </div>
        </div>
        
        <div className={styles.tripDetails}>
          <h4>Trip details</h4>
          <div className={styles.tripDetailsContent}>
            <p>
              {selectedDates.start && selectedDates.end ? 
                `${formatDisplayDate(selectedDates.start)} - ${formatDisplayDate(selectedDates.end)}` : 
                'Select dates'
              }
            </p>
            {/*<button 
              className={styles.changeButton}
              onClick={onDateEdit}
            >
              Change
            </button>*/}
          </div>
          <div className={styles.tripDetailsContent}>
            <p>
              {guests.adults + guests.children > 0 ? 
                `${guests.adults} adult${guests.adults !== 1 ? 's' : ''}${guests.children > 0 ? `, ${guests.children} child${guests.children !== 1 ? 'ren' : ''}` : ''}${guests.infants > 0 ? `, ${guests.infants} infant${guests.infants !== 1 ? 's' : ''}` : ''}` : 
                'No travelers selected'
              }
            </p>
            {/*<button 
              className={styles.changeButton}
              onClick={onGuestsEdit}
            >
              Change
            </button>*/}
          </div>
        </div>
        
        <div className={styles.priceDetails}>
          <h4>Price details</h4>
          {nights > 0 ? (
          <>
            <div className={styles.priceRow}>
              <span>{priceDetails.nightlyRate} $ x {nights} nights</span>
              <span>{priceDetails.subtotal} $</span>
            </div>
            {parseFloat(priceDetails.taxAmount) > 0 && (
              <div className={styles.priceRow}>
                <span>Tourist tax</span>
              <span>{priceDetails.taxAmount} $</span>
              </div>
            )}
            {parseFloat(priceDetails.serviceCharge) > 0 && (
              <div className={styles.priceRow}>
                <span>Service fee</span>
                <span>{priceDetails.serviceCharge} $</span>
              </div>
            )}
            <div className={styles.totalPrice}>
              <span>Total Price</span>
              <span>{priceDetails.total} $</span>
            </div>
            
          </>
        ) : (
          <p>Select dates to see pricing details</p>
        )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;