import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';

interface DocumentItemProps {
  docType: 'kbisOrId' | 'proxy' | 'repId';
  url: string | null;
  displayName: string;
  onView: (url: string) => void;
  onDownload: (url: string) => void;
  className?: string;
}

interface DocumentItemStyles {
  documentItem: string;
  documentInfo: string;
  documentIcon: string;
  documentName: string;
  documentActions: string;
  documentActionButton: string;
}

interface DocumentsListProps {
  documentUrls: {
    kbisOrId: string | null;
    proxy: string | null;
    repId: string | null;
  };
  isAgency: boolean;
  getDocumentDisplayName: (docType: 'kbisOrId' | 'proxy' | 'repId', isAgency?: boolean) => string;
  handleDocumentAction: (url: string, action?: 'view' | 'download') => void;
  styles: DocumentItemStyles & {
    documentsList: string;
    noDocuments: string;
    noDocumentsIcon: string;
    documentsLoading: string;
    documentsError: string;
    retryButton: string;
  };
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Single Document Item Component
export const DocumentItem: React.FC<DocumentItemProps> = ({
  docType,
  url,
  displayName,
  onView,
  onDownload,
  className = ''
}) => {
  if (!url) return null;

  return (
    <div className={className}>
      <div>
        <FileText size={16} />
        <span>{displayName}</span>
      </div>
      <div>
        <button
          onClick={() => onView(url)}
          title="View Document"
          type="button"
        >
          <Eye size={16} />
        </button>
        <button
          onClick={() => onDownload(url)}
          title="Download Document"
          type="button"
        >
          <Download size={16} />
        </button>
      </div>
    </div>
  );
};

// Complete Documents List Component
export const DocumentsList: React.FC<DocumentsListProps> = ({
  documentUrls,
  isAgency,
  getDocumentDisplayName,
  handleDocumentAction,
  styles,
  isLoading = false,
  error = null,
  onRetry
}) => {
  if (isLoading) {
    return (
      <div className={styles.documentsLoading}>
        <p>Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.documentsError}>
        <p>Error loading documents: {error}</p>
        {onRetry && (
          <button onClick={onRetry} className={styles.retryButton}>
            Retry
          </button>
        )}
      </div>
    );
  }

  const hasAnyDocuments = Object.values(documentUrls).some(url => url !== null);

  if (!hasAnyDocuments) {
    return (
      <div className={styles.noDocuments}>
        <FileText className={styles.noDocumentsIcon} />
        <span>No documents uploaded</span>
      </div>
    );
  }

  return (
    <div className={styles.documentsList}>
      {Object.entries(documentUrls).map(([docType, url]) => {
        if (!url) return null;
        
        return (
          <div key={docType} className={styles.documentItem}>
            <div className={styles.documentInfo}>
              <FileText className={styles.documentIcon} />
              <span className={styles.documentName}>
                {getDocumentDisplayName(docType as 'kbisOrId' | 'proxy' | 'repId', isAgency)}
              </span>
            </div>
            <div className={styles.documentActions}>
              <button
                onClick={() => handleDocumentAction(url, 'view')}
                className={styles.documentActionButton}
                title="View Document"
                type="button"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => handleDocumentAction(url, 'download')}
                className={styles.documentActionButton}
                title="Download Document"
                type="button"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentsList;