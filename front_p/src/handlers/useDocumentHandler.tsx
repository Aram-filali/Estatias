'use client';

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { HostData } from '../../types/hostTypes';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/hosts/${hostData.firebaseUid}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (response.data && response.status === 200) {
        setDocumentUrls({
          kbisOrId: response.data.kbisOrId ? `${API_BASE_URL}/hosts/documents/file/${hostData.firebaseUid}/${response.data.kbisOrId}` : null,
          proxy: response.data.proxy ? `${API_BASE_URL}/hosts/documents/file/${hostData.firebaseUid}/${response.data.proxy}` : null,
          repId: response.data.repId ? `${API_BASE_URL}/hosts/documents/file/${hostData.firebaseUid}/${response.data.repId}` : null
        });
      }
    } catch (err: any) {
      console.error('Erreur lors de la récupération des documents:', err);
      setError('Erreur lors de la récupération des documents');
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

    try {
      // Créer un FormData pour l'upload des fichiers
      const uploadData = new FormData();
      
      // Ajouter les fichiers au FormData avec des log pour débugger
      if (formData.kbisOrId instanceof File) {
        console.log('Adding kbisOrId file:', formData.kbisOrId.name, formData.kbisOrId.type);
        uploadData.append('kbisOrId', formData.kbisOrId);
      }
      
      if (formData.proxy instanceof File) {
        console.log('Adding proxy file:', formData.proxy.name, formData.proxy.type);
        uploadData.append('proxy', formData.proxy);
      }
      
      if (formData.repId instanceof File) {
        console.log('Adding repId file:', formData.repId.name, formData.repId.type);
        uploadData.append('repId', formData.repId);
      }
      
      // Ajouter les autres données du formulaire
      uploadData.append('hasRepresentative', formData.hasRepresentative.toString());
      uploadData.append('isAgency', formData.isAgency.toString());
      
      console.log('Sending request to:', `${API_BASE_URL}/hosts/documents/update`);
      
      // Appel direct à l'API Gateway
      const response = await axios.post(
        `${API_BASE_URL}/hosts/documents/update`,
        uploadData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Response received:', response.data);
      
      if (response.data.success || response.status === 200) {
        // Rafraîchir les documents après mise à jour
        await fetchDocuments();
        console.log('Document update successful');
        router.refresh();
        return true;
      } else {
        //setError(response.data.error || 'Échec de la mise à jour des documents');
        return false;
      }
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour des documents:', err);
      
      // Log additional details from the error
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
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
  }, [authToken, hostData, router, fetchDocuments]);

  return { handleUpdateDocuments, fetchDocuments, documentUrls, isLoading, error };
};