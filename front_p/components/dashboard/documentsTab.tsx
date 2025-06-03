// components/DocumentsTab.tsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdCard, faFileAlt, faUpload, faSave } from '@fortawesome/free-solid-svg-icons';
import styles from './MyWebsite.module.css';
import { HostData } from '../../types/hostTypes';
import DocumentCard from './documentCard';

interface DocumentsTabProps {
  hostData: HostData;
  onUpdateDocuments: (updatedData: Partial<HostData>) => Promise<boolean>;
}

export default function DocumentsTab({ hostData, onUpdateDocuments }: DocumentsTabProps) {
  const [formData, setFormData] = useState({
    kbisOrId: hostData.kbisOrId,
    proxy: hostData.proxy,
    repId: hostData.repId,
    hasRepresentative: hostData.hasRepresentative,
    previews: {
      kbisOrId: '',
      proxy: '',
      repId: ''
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;
  
    setFormData(prev => ({
      ...prev,
      [name]: file,
      previews: {
        ...prev.previews,
        [name]: file ? URL.createObjectURL(file) : ''
      }
    }));
  };
  

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdateDocuments(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.documentsSection}>
      <div className={styles.sectionHeader}>
        <h2>Your Documents</h2>
      </div>
      
      <div className={styles.documentsList}>
        <DocumentCard 
          icon={faIdCard}
          title={hostData.isAgency ? 'KBIS Document' : 'ID Document'}
          documentName={formData.kbisOrId instanceof File ? formData.kbisOrId.name : formData.kbisOrId || 'No document uploaded'}
          previewUrl={formData.previews.kbisOrId}
          fieldName="kbisOrId"
          onFileChange={handleFileChange}
        />
        
        {formData.hasRepresentative && (
          <>
            <DocumentCard 
              icon={faFileAlt}
              title="Proxy Document"
              documentName={formData.proxy instanceof File ? formData.proxy.name : formData.proxy || 'No document uploaded'}
              previewUrl={formData.previews.kbisOrId}
              fieldName="proxy"
              onFileChange={handleFileChange}
            />
            
            <DocumentCard 
              icon={faIdCard}
              title="Representative ID"
              documentName={formData.repId instanceof File ? formData.repId.name : formData.repId || 'No document uploaded'}
              previewUrl={formData.previews.kbisOrId}
              fieldName="repId"
              onFileChange={handleFileChange}
            />
          </>
        )}
        
        <div className={styles.formToggle}>
          <label className={styles.toggleLabel}>
            <input 
              type="checkbox" 
              name="hasRepresentative" 
              checked={formData.hasRepresentative}
              onChange={handleCheckboxChange} 
              className={styles.toggleInput}
            />
            <span className={styles.toggleSwitch}></span>
            <span>The real owner is not the representative</span>
          </label>
        </div>
        
        <div className={styles.actionButtons}>
          <button 
            className={styles.saveButton} 
            onClick={handleSave}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faSave} /> Save Documents
          </button>
        </div>
      </div>
    </div>
  );
}