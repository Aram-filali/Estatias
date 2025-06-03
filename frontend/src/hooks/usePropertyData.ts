import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { Property } from '@/types/hostTypes';
import { auth } from '../firebase';

const API_URL = 'http://localhost:3000/properties';
const API_TIMEOUT = 30000;

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

  const getProperties = useCallback(async (): Promise<Property[]> => {
    const user = auth.currentUser;
    if (!user) return [];

    try {
      const token = await getIdToken();
      const response = await axios.get(API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { uid: user.uid },
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
  }, [getIdToken]);

  const loadProperties = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Vous devez être connecté pour accéder à vos propriétés");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getProperties();
      setProperties(data);
    } catch (err) {
      console.error('Erreur lors du chargement des propriétés:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getProperties]);

  const refreshProperties = useCallback(() => loadProperties(), [loadProperties]);



  const getPropertyById = useCallback(async (id: string): Promise<Property | null> => {
    return new Promise((resolve) => {
      // Use onAuthStateChanged to ensure we have the latest auth state
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        // Unsubscribe immediately to prevent memory leaks
        unsubscribe();

        try {
          if (!user) {
            console.error("No authenticated user for property fetch");
            setError("Authentication required to view property");
            resolve(null);
            return;
          }

          console.log('Attempting to fetch property with ID:', id);
          
          // Get the token with careful error handling
          const token = await getIdToken();
          
          const response = await axios.get(`${API_URL}/${id}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
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
          resolve(response.data);
        } catch (err) {
          console.error('Error fetching property by ID:', err);
          
          // More detailed error handling
          if (axios.isAxiosError(err)) {
            if (err.response?.status === 401) {
              setError("Unauthorized. Please log in again.");
            } else if (err.response?.status === 404) {
              setError("Property not found");
            } else {
              setError("Failed to fetch property details");
            }
          } else {
            setError("An unexpected error occurred");
          }
          
          resolve(null);
        }
      });
    });
  }, [getIdToken]);

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



  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadProperties();
      } else {
        setProperties([]);
        setError("Authentification requise");
        setIsLoading(false);
      }
    });

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