import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { Property } from '@/types/hostTypes';
import { auth } from '../firebase';

const API_URL = 'http://localhost:3000/properties';
const API_TIMEOUT = 30000;

// Récupérer l'ID de l'hôte depuis les variables d'environnement
const HOST_ID = process.env.NEXT_PUBLIC_HOST_ID;

export function usePropertyData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  const getIdToken = useCallback(async (forceRefresh = true): Promise<string> => {
    // Enhanced token retrieval with more robust error handling
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("No authenticated user found");
        throw new Error("User not authenticated");
      }
  
      // Ensure the user is fully loaded
      await user.reload();
      
      // Attempt to get the token
      const token = await user.getIdToken(forceRefresh);
      
      if (!token) {
        throw new Error("Failed to retrieve authentication token");
      }
      
      return token;
    } catch (err) {
      console.error("Token retrieval error:", err);
      throw new Error("Failed to authenticate user");
    }
  }, []);

  // Modifier cette méthode pour récupérer les propriétés par hostId
  const getProperties = useCallback(async (): Promise<Property[]> => {
    if (!HOST_ID) {
      console.error("HOST_ID not found in environment variables");
      setError("Configuration error: HOST_ID not found");
      return [];
    }

    try {
      // Utiliser l'endpoint qui récupère les propriétés par hostId
      const response = await axios.get(`${API_URL}/host/${HOST_ID}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: API_TIMEOUT
      });

      return response.data
        .map((prop: any) => ({
          ...prop,
          id: prop.id || prop._id?.toString()
        }))
        .filter((prop: any) => prop.id);
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED') {
        setError('Server timeout - please try again');
      } else if (!axiosErr.response) {
        setError('Network error - check your connection');
      } else {
        setError('Failed to load properties');
      }
      console.error('Error fetching properties:', axiosErr);
      return [];
    }
  }, []); // Pas besoin de getIdToken ici car on n'utilise plus l'auth pour récupérer les propriétés

  const loadProperties = useCallback(async () => {
    if (!HOST_ID) {
      setError("Configuration error: HOST_ID not found");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getProperties();
      setProperties(data);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Erreur lors du chargement des propriétés:', err);
      setError('Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  }, [getProperties]);

  const refreshProperties = useCallback(() => loadProperties(), [loadProperties]);

  const getPropertyById = useCallback(async (id: string): Promise<Property | null> => {
    try {
      console.log('Attempting to fetch property with ID:', id);
      
      const response = await axios.get(`${API_URL}/${id}`, {
        headers: { 
          'Content-Type': 'application/json'
        },
        timeout: API_TIMEOUT,
        transformResponse: [
          (data) => {
            try {
              const parsed = JSON.parse(data);
              console.log('Raw property data:', parsed);
              return {
                ...parsed,
                id: parsed._id || parsed.id,
              };
            } catch (parseError) {
              console.error('Failed to parse property data:', parseError);
              return null;
            }
          }
        ]
      });

      console.log('Property fetch response:', response.data);
      return response.data;
    } catch (err) {
      console.error('Error fetching property by ID:', err);
      
      // More detailed error handling
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          setError("Property not found");
        } else {
          setError("Failed to fetch property details");
        }
      } else {
        setError("An unexpected error occurred");
      }
      
      return null;
    }
  }, []);

  // Ces méthodes nécessitent toujours une authentification
  const updateProperty = useCallback(async (id: string, data: FormData) => {
    const token = await getIdToken();
    const response = await axios.patch(`${API_URL}/${id}`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    
    await refreshProperties();
    return response.data;
  }, [getIdToken, refreshProperties]);

  const deleteProperty = useCallback(async (id: string): Promise<boolean> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }
  
      const token = await getIdToken();
      await axios.delete(`${API_URL}/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: API_TIMEOUT
      });
  
      // Rafraîchir la liste après suppression
      await refreshProperties();
      return true;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        setError('Property not found');
      } else {
        setError('Failed to delete property');
      }
      console.error('Error deleting property:', axiosErr);
      return false;
    }
  }, [getIdToken, refreshProperties]);

  // Modifier useEffect pour charger les propriétés sans authentification
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      // Charger les propriétés même si l'utilisateur n'est pas connecté
      // car on récupère les propriétés d'un hôte spécifique
      loadProperties();
    });

    // Charger les propriétés immédiatement
    loadProperties();

    return () => unsubscribe();
  }, [loadProperties]);

  return {
    isLoading,
    error,
    properties,
    currentUser,
    getPropertyById,
    updateProperty,
    deleteProperty,
    refreshProperties
  };
}