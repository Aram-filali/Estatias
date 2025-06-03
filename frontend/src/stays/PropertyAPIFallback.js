// src/components/PropertyAPIFallback.js
import { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * A component that fetches properties from the API if available,
 * otherwise falls back to local data.
 * 
 * @param {Object} props
 * @param {string} props.hostId - The host ID to fetch properties for
 * @param {Array} props.localProperties - Local properties data as fallback
 * @param {Function} props.onPropertiesLoaded - Callback when properties are loaded
 */
export default function PropertyAPIFallback({ hostId, localProperties, onPropertiesLoaded }) {
  const [loadedProperties, setLoadedProperties] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Try to load from API first
    const loadFromAPI = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/properties/host/${hostId}`, {
          timeout: 5000 // 5 second timeout
        });
        
        if (response.status === 200 && response.data && response.data.length > 0) {
          console.log('Properties loaded from API:', response.data.length);
          setLoadedProperties(response.data);
          onPropertiesLoaded(response.data);
          return;
        }
        
        throw new Error('No properties found or invalid response');
      } catch (err) {
        console.log('Falling back to local properties data:', err.message);
        setError(err.message);
        setLoadedProperties(localProperties); 
        onPropertiesLoaded(localProperties);
      }
    };
    
    loadFromAPI();
  }, [hostId, localProperties, onPropertiesLoaded]);
  
  // This component doesn't render anything directly
  return null;
}