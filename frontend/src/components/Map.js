"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import L from "leaflet";

// Fix for missing marker icons in Next.js
const customIcon = new L.Icon({
  iconUrl: "/marker-icon.png", // Replace with a valid URL if needed
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  // shadowUrl: "/marker-shadow.png", // Uncomment if you have a shadow image
  // shadowSize: [41, 41],
});

// Disable SSR to avoid errors with `window`
const MapComponent = dynamic(() => Promise.resolve(LeafletMap), { ssr: false });

function LeafletMap({ address }) {
  const [isClient, setIsClient] = useState(false);
  const [position, setPosition] = useState([37.7749, -122.4194]); // Default to San Francisco
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug: Log the received address
  useEffect(() => {
    console.log('MapComponent received address:', address);
  }, [address]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Geocoding function with improved error handling and multiple attempts
  const geocodeAddress = async (address) => {
    if (!address) return;

    setLoading(true);
    setError(null);

    const searchVariations = [
      address, // Original address
      address.replace(/,\s*/g, ' '), // Remove commas
      address.split(',').slice(-2).join(', '), // Try with just city and country
      address.split(',').slice(-1)[0].trim(), // Try with just country
    ];

    for (let i = 0; i < searchVariations.length; i++) {
      try {
        console.log(`Trying geocoding attempt ${i + 1}:`, searchVariations[i]);
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchVariations[i])}&limit=1&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'MapComponent/1.0' // Nominatim requires a user agent
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Geocoding response for "${searchVariations[i]}":`, data);

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setPosition([lat, lon]);
          setError(null);
          console.log(`Successfully geocoded to: ${lat}, ${lon}`);
          setLoading(false);
          return; // Success, exit the loop
        }
        
        // Wait between requests to avoid rate limiting
        if (i < searchVariations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error(`Geocoding attempt ${i + 1} failed:`, err);
        if (i === searchVariations.length - 1) {
          setError(`Unable to find location for: ${address}`);
        }
      }
    }
    
    setLoading(false);
  };

  // Geocode the address when it changes
  useEffect(() => {
    if (isClient && address) {
      geocodeAddress(address);
    }
  }, [isClient, address]);

  if (!isClient) {
    return null; // Do not render the map on the server
  }

  return (
    <div>
      {loading && (
        <div className="mb-2 text-sm text-gray-600">
          Loading location for: {address}
        </div>
      )}
      {error && (
        <div className="mb-2 text-sm text-red-600">
          {error}
          <br />
          <span className="text-xs">Searched for: {address}</span>
        </div>
      )}
      <MapContainer
        center={position}
        zoom={13}
        style={{ height: "400px", width: "100%", borderRadius: "10px" }}
        key={`${position[0]}-${position[1]}`} // Force re-render when position changes
      >
        {/* OpenStreetMap background */}
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Marker on the map */}
        <Marker position={position} icon={customIcon}>
          <Popup>
            {address ? `📍 ${address}` : "Property location 📍"}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapComponent;