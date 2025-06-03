'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faUpload, faEye } from '@fortawesome/free-solid-svg-icons';
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
  // Vérifier si nous avons un aperçu du nouveau fichier ou un document existant à afficher
  const hasPreview = previewUrl || existingDocumentUrl;
  const displayUrl = previewUrl || existingDocumentUrl;

  // Fonction pour vérifier si le fichier est une image
  const isImageFile = (url: string): boolean => {
    if (!url) return false;
    const extension = url.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png'].includes(extension || '');
  };

  // Déterminer si le document est une image
  const canShowPreview = hasPreview && isImageFile(displayUrl || '');
  
  // Fonction pour gérer l'ouverture d'un PDF ou autre document
  const handleViewDocument = () => {
    if (displayUrl) {
      window.open(displayUrl, '_blank');
    }
  };

  return (
    <div className={styles.documentCard}>
      <div className={styles.documentHeader}>
        <FontAwesomeIcon icon={icon} className={styles.documentIcon} />
        <h3>{title}</h3>
      </div>
      
      <div className={styles.documentContent}>
        <p className={styles.documentName}>
          {documentName !== 'No document uploaded' ? documentName : 'No document selected'}
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
            <span>Upload {hasPreview ? 'New Document' : 'Document'}</span>
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