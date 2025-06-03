"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../../styles/filterPopup.module.css";
import { FaCreditCard, FaPaypal, FaMoneyBillAlt, FaUniversity } from 'react-icons/fa';
import { CiMoneyCheck1 } from 'react-icons/ci';

const FilterPopup = ({ isOpen, onClose, onApplyFilters }) => {
  const [priceRange, setPriceRange] = useState([0, 0]);
  const [placeType, setPlaceType] = useState("any");
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const popupRef = useRef(null);

  const amenities = [
    { id: "WiFi", name: "WiFi", icon: "wifi" },
    { id: "Kitchen", name: "Kitchen", icon: "kitchen" },
    { id: "Washer", name: "Washer", icon: "washer" },
    { id: "Dryer", name: "Dryer", icon: "dryer" },
    { id: "Free_parking", name: "Free Parking", icon: "parking" },
    { id: "Air_conditioning", name: "Air Conditioning", icon: "air" },
    { id: "Heating", name: "Heating", icon: "heating" },
    { id: "TV", name: "TV", icon: "tv" },
    { id: "Breakfast", name: "Breakfast", icon: "breakfast" },
    { id: "Laptop_friendly_workspace", name: "Laptop-friendly Workspace", icon: "laptop" },
    { id: "Crib", name: "Crib", icon: "crib" },
    { id: "Hair_dryer", name: "Hair Dryer", icon: "hair-dryer" },
    { id: "Iron", name: "Iron", icon: "iron" },
    { id: "Essentials", name: "Essentials", icon: "essentials" },
    { id: "Smoke_alarm", name: "Smoke Alarm", icon: "smoke-alarm" },
    { id: "Carbon_monoxide_alarm", name: "Carbon Monoxide Alarm", icon: "carbon-monoxide" },
    { id: "Fire_extinguisher", name: "Fire Extinguisher", icon: "fire-extinguisher" },
    { id: "First_aid_kit", name: "First Aid Kit", icon: "first-aid" },
    { id: "Lock_on_bedroom_door", name: "Lock on Bedroom Door", icon: "lock" },
    { id: "Hangers", name: "Hangers", icon: "hangers" },
    { id: "Shampoo", name: "Shampoo", icon: "shampoo" },
    { id: "Garden_or_backyard", name: "Garden or Backyard", icon: "garden" },
    { id: "Patio_or_balcony", name: "Patio or Balcony", icon: "patio" },
    { id: "BBQ_grill", name: "BBQ Grill", icon: "bbq" },
  ];


  
  const paymentMethods = [
    { id: "credit_card", name: "Credit Card", icon: <FaCreditCard size={20} style={{ marginRight: '8px' }} /> },
    { id: "debit_card", name: "Debit Card", icon: <FaCreditCard size={20} style={{ marginRight: '8px' }} /> },
    { id: "paypal", name: "Paypal", icon: <FaPaypal size={20} style={{ marginRight: '8px' }} /> },
    { id: "cash", name: "Cash", icon: <FaMoneyBillAlt size={20} style={{ marginRight: '8px' }} /> },
    { id: "check", name: "Check", icon: <CiMoneyCheck1 size={25} style={{ marginRight: '8px' }} /> },
    { id: "bank_transfer", name: "Bank Transfer", icon: <FaUniversity size={20} style={{ marginRight: '8px' }} /> },
  ];
  

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const handleApplyFilters = () => {
    onApplyFilters({
      priceRange,
      placeType,
      amenities: selectedAmenities,
      paymentMethods: selectedPaymentMethods,
    });
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handleClearFilters = () => {
    setPriceRange([0, 0]);
    setPlaceType("any");
    setSelectedAmenities([]);
    setSelectedPaymentMethods([]);
  };

  const toggleShowMore = () => {
    setShowMore(!showMore);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.popupOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className={styles.popupContainer} ref={popupRef}>
            <div className={styles.popupHeader}>
              <h2>Filter Properties</h2>
              <button className={styles.closeButton} onClick={handleClose}>
                <span>&#10005;</span>
              </button>
            </div>
            <div className={styles.popupContent}>
              <div className={styles.filterSection}>
                <h3 className="htitle">Price Range</h3>
                <p className={styles.priceSubtitle}>Select a price range</p>
                <div className={styles.priceInputs}>
                  <div className={styles.priceInputContainer}>
                    <label>Min Price</label>
                    <div className={styles.priceInputWrapper}>
                      <span className={styles.currencySymbol}>$</span>
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Math.max(0, e.target.value), priceRange[1]])}
                      />
                    </div>
                  </div>
                  <div className={styles.priceInputContainer}>
                    <label>Max Price</label>
                    <div className={styles.priceInputWrapper}>
                      <span className={styles.currencySymbol}>$</span>
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Math.max(priceRange[0], e.target.value)])}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter by amenities */}
              <div className={styles.filterSection}>
                <h3 className="htitle">Amenities</h3>
                <div className={styles.filterChips} style={{ maxHeight: showMore ? 'none' : '200px', overflow: 'hidden' }}>
                  {amenities.map((amenity) => (
                    <div
                      key={amenity.id}
                      className={`${styles.filterChip} ${selectedAmenities.includes(amenity.id) ? styles.active : ""}`}
                      onClick={() => {
                        setSelectedAmenities((prev) =>
                          prev.includes(amenity.id)
                            ? prev.filter((id) => id !== amenity.id)
                            : [...prev, amenity.id]
                        );
                      }}
                    >
                      <span className={styles.chipIcon}></span>
                      <span>{amenity.name}</span>
                    </div>
                  ))}
                </div>
                <button className={`${styles.clearButton} ${styles.showMoreButton}`} onClick={toggleShowMore}>
                  {showMore ? "Show Less" : "Show More"}
                </button>
              </div>

              {/* Filter by payment methods */}
              <div className={styles.filterSection}>
                <h3 className="htitle">Payment Methods</h3>
                <div className={styles.filterChips}>
                  {paymentMethods.map((payment) => (
                    <div
                      key={payment.id}
                      className={`${styles.filterChip} ${selectedPaymentMethods.includes(payment.id) ? styles.active : ""}`}
                      onClick={() => {
                        setSelectedPaymentMethods((prev) =>
                          prev.includes(payment.id)
                            ? prev.filter((id) => id !== payment.id)
                            : [...prev, payment.id]
                        );
                      }}
                    >
                      <span className={styles.chipIcon}></span>
                      <span>{payment.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.popupFooter}>
              <button className={styles.clearButton} onClick={handleClearFilters}>
                Clear Filters
              </button>
              <button className={styles.applyButton} onClick={handleApplyFilters}>
                Apply Filters
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterPopup;
