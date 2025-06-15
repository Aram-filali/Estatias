'use client';
import { useState, useEffect } from 'react';
import { Home, AlertTriangle, Check, Filter, Loader2, X, MapPin, Users, Bed, Bath, Maximize, Calendar, DollarSign } from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import styles from './listings.module.css';
import { createPortal } from 'react-dom';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Check if document is available (for SSR compatibility)
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div 
      className={styles.modalOverlay} 
      onClick={handleOverlayClick}
    >
      {children}
    </div>,
    document.body
  );
};

// API service functions
const propertyAPI = {
  async getAllProperties() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/properties/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : data.data || [];
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      console.error('Error fetching properties:', error);
      throw error;
    }
  },

  async updatePropertyStatus(id, status) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${API_BASE_URL}/properties/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to update property status: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      console.error('Error updating property status:', error);
      throw error;
    }
  }
};

// Host API service functions
const hostAPI = {
  async getHostByFirebaseId(firebaseUid, authToken) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${API_BASE_URL}/hosts/${firebaseUid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch host: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      console.error('Error fetching host:', error);
      throw error;
    }
  }
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function Listings() {
  const [properties, setProperties] = useState([]);
  const [hosts, setHosts] = useState({}); // Cache for host data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    host: "all"
  });
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique hosts and property types for filter options
  const uniqueHosts = Array.from(new Set(properties.map(p => p.firebaseUid)));
  const uniqueTypes = Array.from(new Set(properties.map(p => p.type)));

  const router = useRouter();
  
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          console.log('Admin authenticated:', user.uid);
        } catch (err) {
          console.error("Error getting authentication token:", err);
          setError("Authentication error. Please try logging in again.");
        }
      } else {
        setError("You must be logged in to view the admin dashboard.");
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch properties on component mount
  useEffect(() => {
    if (authToken) {
      fetchProperties();
    }
  }, [authToken]);

  // Modal scroll lock effect
  useEffect(() => {
    if (selectedProperty) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [selectedProperty]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && selectedProperty) {
        setSelectedProperty(null);
      }
    };

    if (selectedProperty) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await propertyAPI.getAllProperties();
      setProperties(data);
      
      // Fetch host data for all unique firebase UIDs
      await fetchHostsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch properties');
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch host data for all properties
  const fetchHostsData = async (propertiesData) => {
    if (!authToken) return;
    
    const uniqueFirebaseUids = [...new Set(propertiesData.map(property => property.firebaseUid))];
    const hostPromises = uniqueFirebaseUids.map(async (firebaseUid) => {
      // Skip if we already have this host's data
      if (hosts[firebaseUid]) return null;
      
      try {
        const hostData = await hostAPI.getHostByFirebaseId(firebaseUid, authToken);
        return { firebaseUid, hostData };
      } catch (error) {
        console.error(`Error fetching host ${firebaseUid}:`, error);
        return { firebaseUid, hostData: null };
      }
    });

    try {
      const hostResults = await Promise.all(hostPromises);
      const newHostsData = {};
      
      hostResults.forEach(result => {
        if (result) {
          newHostsData[result.firebaseUid] = result.hostData;
        }
      });
      
      setHosts(prevHosts => ({ ...prevHosts, ...newHostsData }));
    } catch (error) {
      console.error('Error fetching hosts data:', error);
    }
  };

  // Get host display name
  const getHostDisplayName = (firebaseUid) => {
    const hostData = hosts[firebaseUid];
    if (!hostData) {
      return `${firebaseUid.substring(0, 8)}...`; // Fallback to truncated ID
    }
    
    // Try to get name from various possible fields
    const name = hostData.name || 
                 hostData.fullName || 
                 hostData.firstName + (hostData.lastName ? ` ${hostData.lastName}` : '') ||
                 hostData.username ||
                 hostData.email?.split('@')[0] ||
                 `${firebaseUid.substring(0, 8)}...`;
    
    return name;
  };

  // Filter properties based on current filters
  const filteredProperties = properties.filter(property => {
    return (filters.status === "all" || property.status === filters.status) &&
           (filters.type === "all" || property.type === filters.type) &&
           (filters.host === "all" || property.firebaseUid === filters.host);
  });

  // Handle status change (suspend/activate)
  const handleStatusChange = async (property, newStatus) => {
    try {
      // Use _id instead of id, and add proper error handling
      const propertyId = property._id || property.id;
      
      if (!propertyId) {
        console.error('Property ID is missing:', property);
        alert('Error: Property ID is missing. Cannot update status.');
        return;
      }

      console.log('Updating property:', propertyId, 'to status:', newStatus);
      
      await propertyAPI.updatePropertyStatus(propertyId, newStatus);
      
      // Update local state using the correct ID field
      setProperties(prevProperties =>
        prevProperties.map(prop =>
          (prop._id || prop.id) === propertyId ? { ...prop, status: newStatus } : prop
        )
      );
      
      // If modal is open and showing this property, update it too
      if (selectedProperty && (selectedProperty._id || selectedProperty.id) === propertyId) {
        setSelectedProperty({ ...selectedProperty, status: newStatus });
      }
      
      console.log('Property status updated successfully');
    } catch (error) {
      console.error('Error updating property status:', error);
      alert(`Failed to update property status: ${error.message}`);
    }
  };

  // Get display price from availabilities
  const getDisplayPrice = (property) => {
    if (!property.availabilities || property.availabilities.length === 0) {
      return 'Price not set';
    }
    
    try {
      const today = new Date();
      
      // Try to find availability for today first
      let availability = property.availabilities.find(avail => {
        try {
          const startDate = new Date(avail.start_time);
          const endDate = new Date(avail.end_time);
          return startDate <= today && endDate >= today;
        } catch (error) {
          console.error('Error parsing availability dates:', error);
          return false;
        }
      });
      
      // If no availability for today, use the first one
      if (!availability) {
        availability = property.availabilities[0];
      }
      
      const price = availability.isPrice ? availability.otherPlatformPrice : availability.price;
      
      if (price === undefined || price === null || isNaN(price)) {
        return 'Price not set';
      }
      
      return `$${parseFloat(price).toFixed(0)}/night`;
    } catch (error) {
      console.error('Error calculating display price:', error);
      return 'Price not available';
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not available';
    }
  };

  // Generate a unique key for each property
  const getPropertyKey = (property, index) => {
    const id = property._id || property.id;
    if (id) {
      return `property-${id}`;
    }
    if (property.firebaseUid && property.title) {
      return `property-${property.firebaseUid}-${property.title.replace(/\s+/g, '-').toLowerCase()}-${index}`;
    }
    return `property-${index}`;
  };

  // Add better error handling for image loading
  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/300x200/f3f4f6/9ca3af?text=Image+Not+Available';
    e.target.alt = 'Property image not available';
  };

  // Handle view details
  const handleViewDetails = (property) => {
    setSelectedProperty(property);
  };

  // Get amenities list
  const getAmenitiesList = (amenities) => {
    if (!amenities) return [];
    return Object.entries(amenities)
      .filter(([key, value]) => value === true)
      .map(([key]) => key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Handle camelCase
        .replace(/\b\w/g, l => l.toUpperCase())
      );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={`${styles.loadingSpinner} animate-spin`} />
        <p className={styles.loadingText}>Loading properties...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle className={styles.errorIcon} />
        <h2 className={styles.errorTitle}>Error Loading Properties</h2>
        <p className={styles.errorMessage}>{error}</p>
        <button 
          onClick={fetchProperties}
          className={styles.retryButton}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Property Listings</h1>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={styles.filterButton}
          >
            <Filter className={styles.icon} />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className={styles.filterPanel}>
            <div className={styles.filterGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.label}>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className={styles.select}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="suspended">Suspended</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.label}>Property Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className={styles.select}
                >
                  <option value="all">All Types</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.label}>Host</label>
                <select
                  value={filters.host}
                  onChange={(e) => setFilters({ ...filters, host: e.target.value })}
                  className={styles.select}
                >
                  <option value="all">All Hosts</option>
                  {uniqueHosts.map(hostId => (
                    <option key={hostId} value={hostId}>
                      {getHostDisplayName(hostId)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <button 
                  onClick={() => setFilters({ status: "all", type: "all", host: "all" })}
                  className={styles.clearButton}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.resultsCount}>
          Showing {filteredProperties.length} of {properties.length} properties
        </div>

        <div className={styles.grid}>
          {filteredProperties.map((property, index) => (
            <div key={getPropertyKey(property, index)} className={styles.card}>
              <div className={styles.cardContent}>
                {/* Status Badge */}
                <div className={styles.cardHeader}>
                  <div>
                    {property.status === 'pending' && (
                      <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                        Pending
                      </span>
                    )}
                    {property.status === 'rejected' && (
                      <span className={`${styles.statusBadge} ${styles.statusSuspended}`}>
                        Rejected
                      </span>
                    )}
                    {property.status === 'approved' && (
                      <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                        Approved
                      </span>
                    )}
                    {property.status === 'active' && (
                      <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                        Active
                      </span>
                    )}
                    {property.status === 'suspended' && (
                      <span className={`${styles.statusBadge} ${styles.statusSuspended}`}>
                        Suspended
                      </span>
                    )}
                  </div>
                  <div className={styles.priceDisplay}>
                    <p className={styles.price}>{getDisplayPrice(property)}</p>
                  </div>
                </div>

                {/* Property Info */}
                <div className={styles.propertyInfo}>
                  <h3 className={styles.propertyTitle}>{property.title}</h3>
                  <p className={styles.propertyLocation}>{property.address}, {property.city}, {property.country}</p>
                </div>

                {/* Host Info */}
                <div className={styles.hostInfo}>
                  <img
                    className={styles.avatar}
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(getHostDisplayName(property.firebaseUid))}&background=random`}
                    alt={getHostDisplayName(property.firebaseUid)}
                  />
                  <div className={styles.hostDetails}>
                    <p className={styles.hostName}>
                      Host: {getHostDisplayName(property.firebaseUid)}
                    </p>
                    <p className={styles.createdDate}>
                      Added on {formatDate(property.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Property Tags */}
                <div className={styles.tags}>
                  <span className={styles.tag}>
                    <Home className={styles.tagIcon} />
                    {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                  </span>
                  <span className={`${styles.tag} ${styles.tagGray}`}>
                    {property.bedrooms} BR
                  </span>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                  {property.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => handleStatusChange(property, 'rejected')}
                        className={`${styles.actionButton} ${styles.suspendButton}`}
                      >
                        <AlertTriangle className={styles.iconSm} />
                        Reject
                      </button>
                      <button 
                        onClick={() => handleStatusChange(property, 'approved')}
                        className={`${styles.actionButton} ${styles.activateButton}`}
                      >
                        <Check className={styles.iconSm} />
                        Approve
                      </button>
                    </>
                  ) : (property.status === 'approved' || property.status === 'active') ? (
                    <button 
                      onClick={() => handleStatusChange(property, 'suspended')}
                      className={`${styles.actionButton} ${styles.suspendButton}`}
                    >
                      <AlertTriangle className={styles.iconSm} />
                      Suspend
                    </button>
                  ) : null}
                  
                  <button 
                    onClick={() => handleViewDetails(property)}
                    className={`${styles.actionButton} ${styles.viewButton}`}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProperties.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <Home className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>No properties found</h3>
            <p className={styles.emptyMessage}>
              {properties.length === 0 
                ? "No properties have been added yet." 
                : "No properties match your current filters."}
            </p>
          </div>
        )}
      </div>

      {/* Property Details Modal */}
      <Modal isOpen={!!selectedProperty} onClose={() => setSelectedProperty(null)}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>
              {selectedProperty?.title || 'Property Details'}
            </h2>
            <button 
              onClick={() => setSelectedProperty(null)} 
              className={styles.closeButton}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className={styles.modalContent}>
            {selectedProperty && (
              <>
                {/* Property Photos */}
                {selectedProperty.mainPhotos && selectedProperty.mainPhotos.length > 0 && (
                  <div className={styles.photoSection}>
                    <h3 className={styles.sectionTitle}>Photos</h3>
                    <div className={styles.photoGrid}>
                      {selectedProperty.mainPhotos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Property photo ${index + 1}`}
                          className={styles.propertyPhoto}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Basic Info */}
                <div className={styles.basicInfo}>
                  <h3 className={styles.sectionTitle}>Basic Information</h3>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <MapPin className={styles.infoIcon} />
                      <div>
                        <span className={styles.infoLabel}>Location</span>
                        <span className={styles.infoValue}>
                          {selectedProperty.address}, {selectedProperty.city}, {selectedProperty.country}
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <Home className={styles.infoIcon} />
                      <div>
                        <span className={styles.infoLabel}>Type</span>
                        <span className={styles.infoValue}>
                          {selectedProperty.type?.charAt(0).toUpperCase() + selectedProperty.type?.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <Users className={styles.infoIcon} />
                      <div>
                        <span className={styles.infoLabel}>Max Guests</span>
                        <span className={styles.infoValue}>{selectedProperty.maxGuest}</span>
                      </div>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <Bed className={styles.infoIcon} />
                      <div>
                        <span className={styles.infoLabel}>Bedrooms</span>
                        <span className={styles.infoValue}>{selectedProperty.bedrooms}</span>
                      </div>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <Bath className={styles.infoIcon} />
                      <div>
                        <span className={styles.infoLabel}>Bathrooms</span>
                        <span className={styles.infoValue}>{selectedProperty.bathrooms}</span>
                      </div>
                    </div>
                    
                    {selectedProperty.size && (
                      <div className={styles.infoItem}>
                        <Maximize className={styles.infoIcon} />
                        <div>
                          <span className={styles.infoLabel}>Size</span>
                          <span className={styles.infoValue}>{selectedProperty.size} sq ft</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedProperty.description && (
                  <div className={styles.descriptionSection}>
                    <h3 className={styles.sectionTitle}>Description</h3>
                    <p className={styles.description}>{selectedProperty.description}</p>
                  </div>
                )}

                {/* Pricing */}
                <div className={styles.pricingSection}>
                  <h3 className={styles.sectionTitle}>Pricing</h3>
                  <div className={styles.pricingInfo}>
                    <div className={styles.priceItem}>
                      <DollarSign className={styles.infoIcon} />
                      <span>Price per night: {getDisplayPrice(selectedProperty)}</span>
                    </div>
                    {selectedProperty.minNight && (
                      <div className={styles.priceItem}>
                        <Calendar className={styles.infoIcon} />
                        <span>Min nights: {selectedProperty.minNight}</span>
                      </div>
                    )}
                    {selectedProperty.maxNight && (
                      <div className={styles.priceItem}>
                        <Calendar className={styles.infoIcon} />
                        <span>Max nights: {selectedProperty.maxNight}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Amenities */}
                {selectedProperty.amenities && (
                  <div className={styles.amenitiesSection}>
                    <h3 className={styles.sectionTitle}>Amenities</h3>
                    <div className={styles.amenitiesList}>
                      {getAmenitiesList(selectedProperty.amenities).map((amenity, index) => (
                        <span key={index} className={styles.amenityTag}>
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                <div className={styles.contactSection}>
                  <h3 className={styles.sectionTitle}>Contact Information</h3>
                  <div className={styles.contactInfo}>
                    <p><strong>Host:</strong> {getHostDisplayName(selectedProperty.firebaseUid)}</p>
                    <p><strong>Host ID:</strong> {selectedProperty.firebaseUid}</p>
                    {selectedProperty.phone && (
                      <p><strong>Phone:</strong> {selectedProperty.phone}</p>
                    )}
                    {selectedProperty.email && (
                      <p><strong>Email:</strong> {selectedProperty.email}</p>
                    )}
                    {selectedProperty.website && (
                      <p><strong>Website:</strong> {selectedProperty.website}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}