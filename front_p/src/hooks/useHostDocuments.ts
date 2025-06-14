import { useState, useCallback, useEffect } from 'react';

// Types
interface DocumentUrls {
  kbisOrId: string | null;
  proxy: string | null;
  repId: string | null;
}

interface HostDocumentsData {
  firebaseUid: string;
  kbisOrId: string | null;
  proxy: string | null;
  repId: string | null;
  hasRepresentative: boolean;
  isAgency: boolean;
  email: string;
  businessName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface UseHostDocumentsReturn {
  documentUrls: DocumentUrls;
  isLoading: boolean;
  error: string | null;
  fetchDocuments: (firebaseUid: string) => Promise<void>;
  clearDocuments: () => void;
  hasDocuments: boolean;
  getDocumentDisplayName: (docType: keyof DocumentUrls, isAgency?: boolean) => string;
  handleDocumentAction: (url: string, action?: 'view' | 'download') => void;
}

export const useHostDocuments = (authToken: string | null): UseHostDocumentsReturn => {
  const [documentUrls, setDocumentUrls] = useState<DocumentUrls>({
    kbisOrId: null,
    proxy: null,
    repId: null
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Clear documents when component unmounts or when needed
  const clearDocuments = useCallback(() => {
    setDocumentUrls({
      kbisOrId: null,
      proxy: null,
      repId: null
    });
    setError(null);
  }, []);

  // Fetch documents for a specific host
  const fetchDocuments = useCallback(async (firebaseUid: string): Promise<void> => {
    if (!authToken || !firebaseUid) {
      console.log('Missing requirements for fetchDocuments:', {
        hasAuthToken: !!authToken,
        hasFirebaseUid: !!firebaseUid,
        firebaseUid: firebaseUid
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching documents for host:', firebaseUid);
      console.log('API URL:', `${API_BASE_URL}/hosts/${firebaseUid}/documents`);

      const response = await fetch(`${API_BASE_URL}/hosts/${firebaseUid}/documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 404) {
          throw new Error('Host not found');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await response.json();
      console.log('Documents API response:', result);

      if (result && (result.data || result.success)) {
        const documentsData: HostDocumentsData = result.data || result;
        
        console.log('Setting document URLs:', documentsData);
        
        setDocumentUrls({
          kbisOrId: documentsData.kbisOrId || null,
          proxy: documentsData.proxy || null,
          repId: documentsData.repId || null
        });
      } else {
        console.warn('Unexpected response structure:', result);
        setError('Unexpected response format');
      }

    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err.message || 'Error loading documents');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, API_BASE_URL]);

  // Helper function to get document type display name
  const getDocumentDisplayName = useCallback((docType: keyof DocumentUrls, isAgency?: boolean): string => {
    switch (docType) {
      case 'kbisOrId':
        return isAgency ? 'KBIS Document' : 'ID Document';
      case 'proxy':
        return 'Proxy Document';
      case 'repId':
        return 'Representative ID';
      default:
        return docType;
    }
  }, []);

  // Helper function to handle document viewing/downloading
  const handleDocumentAction = useCallback((url: string, action: 'view' | 'download' = 'view') => {
    if (!url) {
      console.warn('No URL provided for document action');
      return;
    }
    
    if (action === 'view') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (action === 'download') {
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = ''; // Empty string to use the original filename
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  // Check if any documents are available
  const hasDocuments = Object.values(documentUrls).some(url => url !== null);

  // Clear documents when auth token changes
  useEffect(() => {
    if (!authToken) {
      clearDocuments();
    }
  }, [authToken, clearDocuments]);

  return {
    documentUrls,
    isLoading,
    error,
    fetchDocuments,
    clearDocuments,
    hasDocuments,
    getDocumentDisplayName,
    handleDocumentAction
  };
};