'use client';

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { HostData } from '../../types/hostTypes';
import imageCompression from "browser-image-compression";
import { storage } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Interface pour le retour du handler
interface UseDocumentsHandlerReturn {
  handleUpdateDocuments: (formData: any) => Promise<boolean>;
  fetchDocuments: () => Promise<void>;
  documentUrls: {
    kbisOrId: string | null;
    proxy: string | null;
    repId: string | null;
  };
  isLoading: boolean;
  error: string | null;
}

// Fonction pour obtenir l'URL de base de l'API
const getApiBaseUrl = () => {
  // En production, utilisez l'URL de votre API Gateway déployée
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://your-api-gateway-url.onrender.com';
  }
  // En développement, utilisez localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

// Function to compress an image before sending (same as in host creation)
const compressImage = async (file: File): Promise<File> => {
  if (file.type.startsWith('image/')) {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Error compressing image:", error);
      throw error;
    }
  }
  return file;
};

// Function to upload file to Firebase Storage (same as in host creation)
const uploadFileToStorage = async (file: File, folder: string, userId: string): Promise<{ url: string, storagePath: string }> => {
  try {
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}_${timestamp}.${fileExtension}`;
    const storagePath = `${folder}/${fileName}`;
    
    const storageRef = ref(storage, storagePath);
    const fileToUpload = file.type.startsWith('image/') ? await compressImage(file) : file;
    
    const snapshot = await uploadBytes(storageRef, fileToUpload);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return { url: downloadURL, storagePath };
  } catch (error) {
    console.error(`Error uploading file to ${folder}:`, error);
    throw new Error(`Failed to upload file to ${folder}`);
  }
};

// Function to delete a file from Firebase Storage (same as in host creation)
const deleteFileFromStorage = async (storagePath: string): Promise<void> => {
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
    console.log(`Successfully deleted file at ${storagePath}`);
  } catch (error) {
    console.error(`Error deleting file at ${storagePath}:`, error);
  }
};

// Helper function to extract storage path from Firebase URL
const extractStoragePathFromUrl = (url: string): string | null => {
  try {
    // Firebase Storage URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlParts = url.split('/o/');
    if (urlParts.length > 1) {
      const pathWithQuery = urlParts[1];
      const pathWithoutQuery = pathWithQuery.split('?')[0];
      return decodeURIComponent(pathWithoutQuery);
    }
    return null;
  } catch (error) {
    console.error('Error extracting storage path from URL:', error);
    return null;
  }
};

export const useDocumentsHandler = (
  hostData: HostData | undefined,
  authToken: string | null
): UseDocumentsHandlerReturn => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [documentUrls, setDocumentUrls] = useState<{
    kbisOrId: string | null;
    proxy: string | null;
    repId: string | null;
  }>({
    kbisOrId: null,
    proxy: null,
    repId: null
  });

  // Fonction pour récupérer les URLs des documents existants
  const fetchDocuments = useCallback(async (): Promise<void> => {
    if (!authToken || !hostData?.firebaseUid) {
      console.log('Missing requirements for fetchDocuments:', {
      hasAuthToken: !!authToken,
      hasHostData: !!hostData,
      hasFirebaseUid: !!hostData?.firebaseUid,
      firebaseUid: hostData?.firebaseUid
    });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiBaseUrl = getApiBaseUrl();
      console.log('Fetching documents for host:', hostData.firebaseUid);
      console.log('API URL:', `${apiBaseUrl}/hosts/${hostData.firebaseUid}/documents`);
      console.log('Auth token present:', !!authToken);

      const response = await axios.get(
        `${apiBaseUrl}/hosts/${hostData.firebaseUid}/documents`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
          }
        }
      );

      console.log('Documents API response:', {
      status: response.status,
      data: response.data
    });

      if (response.data && response.status === 200) {
        // Set the document URLs directly (they are already Firebase Storage URLs)
        const documentsData = response.data.data || response.data;
      
        console.log('Setting document URLs:', documentsData);
        
        setDocumentUrls({
          kbisOrId: documentsData.kbisOrId || null,
          proxy: documentsData.proxy || null,
          repId: documentsData.repId || null
        });
      } else {
      console.warn('Unexpected response structure:', response);
      setError('Unexpected response format');
    }

    } catch (err: any) {
      console.error('Error fetching documents:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers
        }
      });
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 404) {
        setError('Host not found');
      } else {
        setError(err.response?.data?.message || err.message || 'Error loading documents');
      }
    } finally {
      setIsLoading(false);
    }
  }, [authToken, hostData?.firebaseUid]);

  // Charger les documents au chargement du composant
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpdateDocuments = useCallback(async (formData: any): Promise<boolean> => {
    if (!authToken) {
      setError('Authentification requise');
      return false;
    }

    if (!hostData) {
      setError('Données de l\'hôte requises');
      return false;
    }

    setIsLoading(true);
    setError(null);

    const uploadedFiles: { url: string, storagePath: string }[] = [];
    let updateSuccess = false;

    try {
      // Prepare the data to send to backend
      const fileUrls: any = {};
      const oldStoragePaths: string[] = [];

      // Upload new files to Firebase Storage if they exist
      if (formData.kbisOrId instanceof File) {
        // If there's an existing document, mark it for deletion
        if (documentUrls.kbisOrId) {
          const oldPath = extractStoragePathFromUrl(documentUrls.kbisOrId);
          if (oldPath) oldStoragePaths.push(oldPath);
        }
        
        const kbisOrIdUpload = await uploadFileToStorage(
          formData.kbisOrId, 
          "KBIS - ID document", 
          hostData.firebaseUid
        );
        fileUrls.kbisOrId = kbisOrIdUpload.url;
        uploadedFiles.push(kbisOrIdUpload);
      }

      if (formData.proxy instanceof File) {
        if (documentUrls.proxy) {
          const oldPath = extractStoragePathFromUrl(documentUrls.proxy);
          if (oldPath) oldStoragePaths.push(oldPath);
        }
        
        const proxyUpload = await uploadFileToStorage(
          formData.proxy, 
          "Proxy Document", 
          hostData.firebaseUid
        );
        fileUrls.proxy = proxyUpload.url;
        uploadedFiles.push(proxyUpload);
      }

      if (formData.repId instanceof File) {
        if (documentUrls.repId) {
          const oldPath = extractStoragePathFromUrl(documentUrls.repId);
          if (oldPath) oldStoragePaths.push(oldPath);
        }
        
        const repIdUpload = await uploadFileToStorage(
          formData.repId, 
          "Representative ID", 
          hostData.firebaseUid
        );
        fileUrls.repId = repIdUpload.url;
        uploadedFiles.push(repIdUpload);
      }

      // Prepare data to send to backend (similar to host creation)
      const dataToSend = {
        hasRepresentative: formData.hasRepresentative,
        isAgency: formData.isAgency,
        firebaseUid: hostData.firebaseUid,
        ...fileUrls // Include the new Firebase Storage URLs
      };

      console.log('Sending data to backend:', JSON.stringify(dataToSend, null, 2));

      // Send update request to backend
      const apiBaseUrl = getApiBaseUrl();
      const response = await axios.patch(
        `${apiBaseUrl}/hosts/documents/update`,
        dataToSend,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Response received:', response.data);
      
      if (response.data.success || response.status === 200) {
        updateSuccess = true;
        
        // Delete old files from Firebase Storage after successful update
        for (const oldPath of oldStoragePaths) {
          await deleteFileFromStorage(oldPath);
        }
        
        // Refresh documents after successful update
        await fetchDocuments();
        console.log('Document update successful');
        router.refresh();
        return true;
      } else {
        setError(response.data.error || 'Échec de la mise à jour des documents');
        return false;
      }
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour des documents:', err);
      
      // Clean up uploaded files if backend update failed
      if (!updateSuccess) {
        for (const file of uploadedFiles) {
          await deleteFileFromStorage(file.storagePath);
        }
      }
      
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError(err.message || 'Une erreur est survenue lors de la mise à jour des documents');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authToken, hostData, router, fetchDocuments, documentUrls]);

  return { handleUpdateDocuments, fetchDocuments, documentUrls, isLoading, error };
};