import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import styles from './deleteProp.module.css';
// First, add your CSS to your MyWebsite.module.css file
// (I'm showing how the component would look, assuming the CSS is already added)

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Property", 
  message1 = "Are you sure you want to delete this property? This action cannot be undone." ,
  /*message2 = "Are you sure you want to delete this property? This action cannot be undone." */
}) {
  if (!isOpen) return null;
  
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.confirmationModal} onClick={(e) => e.stopPropagation()}>
        <h3>
          <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '10px' }} />
          {title}
        </h3>
        <p>{message1}</p>
        
        
        <div className={styles.modalButtons}>
          <button className={`${styles.button} ${styles.cancelButton}`} onClick={onClose}>
            Cancel
          </button>
          <button className={`${styles.button} ${styles.deleteButton}`} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}