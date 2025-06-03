// CancelBookingModal.jsx
import React, { useState } from 'react';
import styles from './CancelBookingModal.module.css';

const CancelBookingModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loading = false,
  bookingDetails = null 
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <svg className={styles.warningIcon} viewBox="0 0 24 24" fill="none">
              <path 
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className={styles.title}>Cancel Booking</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none">
              <path 
                d="M6 6l12 12M6 18L18 6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.message}>
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>
          
          {/*bookingDetails && (
            <div className={styles.bookingInfo}>
              <h4>Booking Details:</h4>
              <div className={styles.details}>
                {bookingDetails.date && <span>Date: {bookingDetails.date}</span>}
                {bookingDetails.time && <span>Time: {bookingDetails.time}</span>}
                {bookingDetails.service && <span>Service: {bookingDetails.service}</span>}
              </div>
            </div>
          )*/}
        </div>
        
        <div className={styles.actions}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
            disabled={loading}
          >
            Keep Booking
          </button>
          <button 
            className={`${styles.confirmButton} ${loading ? styles.loading : ''}`} 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Canceling...
              </>
            ) : (
              'Cancel Booking'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusModal = ({ 
  isOpen, 
  onClose, 
  type = 'success', // 'success', 'error', 'info'
  title, 
  message,
  autoClose = false,
  autoCloseDelay = 3000 
}) => {
  React.useEffect(() => {
    if (autoClose && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, isOpen, onClose, autoCloseDelay]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className={styles.successIcon} viewBox="0 0 24 24" fill="none">
            <path 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'error':
        return (
          <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="none">
            <path 
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return (
          <svg className={styles.infoIcon} viewBox="0 0 24 24" fill="none">
            <path 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        );
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.statusModal} ${styles[type]}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.statusHeader}>
          <div className={styles.statusIconWrapper}>
            {getIcon()}
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none">
              <path 
                d="M6 6l12 12M6 18L18 6" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        
        <div className={styles.statusContent}>
          <h3 className={styles.statusTitle}>{title}</h3>
          <p className={styles.statusMessage}>{message}</p>
        </div>
        
        <div className={styles.statusActions}>
          <button className={styles.okButton} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook to manage modal states
export const useBookingModals = () => {
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    loading: false
  });
  
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showConfirmModal = () => {
    setConfirmModal({ isOpen: true, loading: false });
  };

  const hideConfirmModal = () => {
    setConfirmModal({ isOpen: false, loading: false });
  };

  const setConfirmLoading = (loading) => {
    setConfirmModal(prev => ({ ...prev, loading }));
  };

  const showStatusModal = (type, title, message, autoClose = false) => {
    setStatusModal({ 
      isOpen: true, 
      type, 
      title, 
      message 
    });
  };

  const hideStatusModal = () => {
    setStatusModal({ 
      isOpen: false, 
      type: 'info', 
      title: '', 
      message: '' 
    });
  };

  return {
    confirmModal,
    statusModal,
    showConfirmModal,
    hideConfirmModal,
    setConfirmLoading,
    showStatusModal,
    hideStatusModal
  };
};

export { CancelBookingModal, StatusModal };