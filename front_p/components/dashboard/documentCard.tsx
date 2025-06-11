'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faUpload, faEye, faCheck } from '@fortawesome/free-solid-svg-icons';
import styles from './DocumentCard.module.css';

interface DocumentCardProps {
  icon: IconDefinition;
  title: string;
  documentName: string;
  previewUrl?: string;
  existingDocumentUrl?: string | null;
  fieldName: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  icon,
  title,
  documentName,
  previewUrl,
  existingDocumentUrl,
  fieldName,
  onFileChange
}) => {
  // Check if we have a new preview or existing document
  const hasPreview = previewUrl || existingDocumentUrl;
  const displayUrl = previewUrl || existingDocumentUrl;
  const hasExistingDocument = existingDocumentUrl && !previewUrl;

  // Function to check if file is an image
  const isImageFile = (url: string): boolean => {
    if (!url) return false;
    const extension = url.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png'].includes(extension || '');
  };

  // Determine if document is an image
  const canShowPreview = hasPreview && isImageFile(displayUrl || '');

  // Function to handle opening PDF or other documents
  const handleViewDocument = () => {
    if (displayUrl) {
      window.open(displayUrl, '_blank');
    }
  };

  // Determine the status and styling
  const documentExists = documentName !== 'No document uploaded';
  const isNewUpload = previewUrl && !existingDocumentUrl;

  return (
    <div className={`${styles.documentCard} ${documentExists ? styles.hasDocument : ''}`}>
      <div className={styles.documentHeader}>
        <FontAwesomeIcon icon={icon} className={styles.documentIcon} />
        <h3>{title}</h3>
        {documentExists && !isNewUpload && (
          <FontAwesomeIcon icon={faCheck} className={styles.statusIcon} />
        )}
      </div>
      
      <div className={styles.documentContent}>
        <p className={`${styles.documentName} ${documentExists ? styles.documentExists : styles.noDocument}`}>
          {documentExists ? documentName : 'No document selected'}
        </p>
        
        {hasPreview && (
          <div className={styles.previewContainer}>
            {canShowPreview ? (
              <img 
                src={displayUrl || ''}
                alt={`Preview of ${title}`}
                className={styles.documentPreview}
              />
            ) : (
              <button
                className={styles.viewButton}
                onClick={handleViewDocument}
              >
                <FontAwesomeIcon icon={faEye} /> View Document
              </button>
            )}
          </div>
        )}
        
        <div className={styles.uploadArea}>
          <label htmlFor={fieldName} className={styles.uploadButton}>
            <FontAwesomeIcon icon={faUpload} />
            <span>
              {hasExistingDocument 
                ? 'Replace Document' 
                : hasPreview 
                  ? 'Change Document' 
                  : 'Upload Document'
              }
            </span>
            <input
              type="file"
              id={fieldName}
              name={fieldName}
              onChange={onFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className={styles.fileInput}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;