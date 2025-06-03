import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import styles from './Popup.module.css';


const ErrorPopup = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <AlertCircle size={20} />
            <h3 className={styles.title}>Error</h3>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          <p className={styles.errorText}>{error}</p>
        </div>
        <div className={styles.footer}>
          <button
            onClick={onClose}
            className={styles.actionButton}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default ErrorPopup;