// components/DocumentCard.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition, faUpload } from '@fortawesome/free-solid-svg-icons';
import styles from './MyWebsite.module.css';

interface DocumentCardProps {
  icon: IconDefinition;
  title: string;
  documentName: string;
  fieldName: string;
  previewUrl?: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DocumentCard({
  icon,
  title,
  documentName,
  fieldName,
  previewUrl,
  onFileChange
}: DocumentCardProps) {
  return (
    <div className={styles.documentCard}>
      <div className={styles.documentIcon}>
        <FontAwesomeIcon icon={icon} />
      </div>
      <div className={styles.documentDetails}>
        <h3>{title}</h3>
        <p>{documentName}</p>
      </div>
      <div className={styles.documentActions}>
        <label className={styles.uploadButton}>
          <FontAwesomeIcon icon={faUpload} />
          <input 
            type="file" 
            name={fieldName} 
            onChange={onFileChange} 
            className={styles.fileInput} 
            accept=".pdf,.jpg,.jpeg,.png,.docx" 
          />
        </label>
              {previewUrl && (
        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
          Preview
        </a>
      )}
      </div>
    </div>
  );
}