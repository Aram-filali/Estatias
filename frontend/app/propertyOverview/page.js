import React from 'react';
import styles from '../../styles/propertyOverview.module.css'; // Remplace par le bon fichier de styles

export default function propertyOverview() {
  return (
    <div className={styles.propertyOverviewContainer}>
      {/* Property Overview Section */}
      <h2 className={styles.propertyOverviewTitle}>Property Overview</h2>
      <div className={styles.propertyOverviewGrid}>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>🏷️</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>ID NO.</span>
            <span className={styles.propertyOverviewValue}>#1234</span>
          </div>
        </div>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>🏠</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>Type</span>
            <span className={styles.propertyOverviewValue}>Residential</span>
          </div>
        </div>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>📦</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>Room</span>
            <span className={styles.propertyOverviewValue}>6</span>
          </div>
        </div>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>🛏️</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>Bedroom</span>
            <span className={styles.propertyOverviewValue}>4</span>
          </div>
        </div>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>🚿</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>Bath</span>
            <span className={styles.propertyOverviewValue}>2</span>
          </div>
        </div>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>🏘️</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>Purpose</span>
            <span className={styles.propertyOverviewValue}>For Rent</span>
          </div>
        </div>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>📏</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>Sqft</span>
            <span className={styles.propertyOverviewValue}>1400</span>
          </div>
        </div>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>🚗</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>Parking</span>
            <span className={styles.propertyOverviewValue}>Yes</span>
          </div>
        </div>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>🛗</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>Elevator</span>
            <span className={styles.propertyOverviewValue}>Yes</span>
          </div>
        </div>
        <div className={styles.propertyOverviewItem}>
          <div className={styles.propertyOverviewIcon}>📶</div>
          <div className={styles.propertyOverviewDetails}>
            <span className={styles.propertyOverviewLabel}>Wifi</span>
            <span className={styles.propertyOverviewValue}>Yes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
