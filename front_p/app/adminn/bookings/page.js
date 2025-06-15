"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Search, Eye, Clock, CheckCircle, XCircle, User, Home, DollarSign } from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import styles from './AdminBookingsPage.module.css';

const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [propertyTitles, setPropertyTitles] = useState({}); // Cache for property titles
  const [hostNames, setHostNames] = useState({}); // Cache for host names
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [filters, setFilters] = useState({
    propertyId: '',
    status: '',
    fromDate: '',
    toDate: '',
    searchTerm: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

  // Fetch property title by ID
  const fetchPropertyTitle = async (propertyId) => {
    if (propertyTitles[propertyId]) {
      return propertyTitles[propertyId];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/properties/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const title = result.title || `Property ${propertyId}`;
        
        // Cache the title
        setPropertyTitles(prev => ({
          ...prev,
          [propertyId]: title
        }));
        
        return title;
      } else {
        console.warn(`Failed to fetch property ${propertyId}:`, response.status);
        return `Property ${propertyId}`;
      }
    } catch (err) {
      console.error(`Error fetching property ${propertyId}:`, err);
      return `Property ${propertyId}`;
    }
  };

  // Fetch host name by Firebase UID
  const fetchHostName = async (hostId) => {
    if (hostNames[hostId]) {
      return hostNames[hostId];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/hosts/${hostId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const hostData = await response.json();
        let hostName;
        
        if (hostData.isAgency) {
          hostName = hostData.businessName || `Host ${hostId}`;
        } else {
          const firstName = hostData.firstName || '';
          const lastName = hostData.lastName || '';
          hostName = `${firstName} ${lastName}`.trim() || `Host ${hostId}`;
        }
        
        // Cache the host name
        setHostNames(prev => ({
          ...prev,
          [hostId]: hostName
        }));
        
        return hostName;
      } else {
        console.warn(`Failed to fetch host ${hostId}:`, response.status);
        return `Host ${hostId}`;
      }
    } catch (err) {
      console.error(`Error fetching host ${hostId}:`, err);
      return `Host ${hostId}`;
    }
  };

  // Fetch property titles for all bookings
  const fetchPropertyTitles = async (bookingsData) => {
    if (!authToken) return bookingsData;

    setLoadingProperties(true);
    const uniquePropertyIds = [...new Set(bookingsData.map(booking => booking.propertyId))];
    
    try {
      // Fetch all property titles in parallel
      const titlePromises = uniquePropertyIds.map(async (propertyId) => {
        const title = await fetchPropertyTitle(propertyId);
        return { propertyId, title };
      });

      const titleResults = await Promise.all(titlePromises);
      
      // Update the property titles cache
      const newTitles = {};
      titleResults.forEach(({ propertyId, title }) => {
        newTitles[propertyId] = title;
      });
      
      setPropertyTitles(prev => ({ ...prev, ...newTitles }));
      
    } catch (err) {
      console.error('Error fetching property titles:', err);
    } finally {
      setLoadingProperties(false);
    }

    return bookingsData;
  };

  // Fetch host names for all bookings
  const fetchHostNames = async (bookingsData) => {
    if (!authToken) return bookingsData;

    setLoadingHosts(true);
    const uniqueHostIds = [...new Set(bookingsData.map(booking => booking.hostId))];
    
    try {
      // Fetch all host names in parallel
      const hostPromises = uniqueHostIds.map(async (hostId) => {
        const hostName = await fetchHostName(hostId);
        return { hostId, hostName };
      });

      const hostResults = await Promise.all(hostPromises);
      
      // Update the host names cache
      const newHostNames = {};
      hostResults.forEach(({ hostId, hostName }) => {
        newHostNames[hostId] = hostName;
      });
      
      setHostNames(prev => ({ ...prev, ...newHostNames }));
      
    } catch (err) {
      console.error('Error fetching host names:', err);
    } finally {
      setLoadingHosts(false);
    }

    return bookingsData;
  };

  // Fetch bookings from API
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.propertyId) queryParams.append('propertyId', filters.propertyId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.fromDate) queryParams.append('fromDate', filters.fromDate);
      if (filters.toDate) queryParams.append('toDate', filters.toDate);

      const response = await fetch(`${API_BASE_URL}/bookings?${queryParams.toString()}`);
      const result = await response.json();
      
      if (result.statusCode === 200) {
        let bookingsData = result.data || [];
        
        // Apply client-side search filter
        if (filters.searchTerm) {
          bookingsData = bookingsData.filter(booking => 
            booking.customer.fullName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            booking.customer.email.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            booking.propertyId.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            (propertyTitles[booking.propertyId] && 
             propertyTitles[booking.propertyId].toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
            (hostNames[booking.hostId] && 
             hostNames[booking.hostId].toLowerCase().includes(filters.searchTerm.toLowerCase()))
          );
        }
        
        setBookings(bookingsData);
        
        // Fetch property titles and host names for the bookings
        await Promise.all([
          fetchPropertyTitles(bookingsData),
          fetchHostNames(bookingsData)
        ]);
        
      } else {
        setError(result.message || 'Failed to fetch bookings');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchBookings();
    }
  }, [filters.propertyId, filters.status, filters.fromDate, filters.toDate, authToken]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (authToken) {
        fetchBookings();
      }
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [filters.searchTerm]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      propertyId: '',
      status: '',
      fromDate: '',
      toDate: '',
      searchTerm: ''
    });
  };

  const getStatusClass = (status) => {
    const statusClasses = {
      pending: styles.statusPending,
      approved: styles.statusApproved,
      confirmed: styles.statusConfirmed,
      rejected: styles.statusRejected,
      canceled: styles.statusCanceled,
      completed: styles.statusCompleted
    };
    return statusClasses[status] || styles.statusCanceled;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'canceled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Get property display name (title or fallback to ID)
  const getPropertyDisplayName = (propertyId) => {
    return propertyTitles[propertyId] || `Property ${propertyId}`;
  };

  // Get host display name (name or fallback to ID)
  const getHostDisplayName = (hostId) => {
    return hostNames[hostId] || `Host ${hostId}`;
  };

  const BookingModal = ({ booking, onClose }) => {
    if (!booking) return null;

    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Booking Details</h2>
            <button
              onClick={onClose}
              className={styles.modalCloseButton}
            >
              ×
            </button>
          </div>
          
          <div className={styles.modalBody}>
            {/* Booking Status */}
            <div className={styles.modalStatusContainer}>
              <span className={`${styles.statusBadge} ${getStatusClass(booking.status)}`}>
                {getStatusIcon(booking.status)}
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
              <span className={styles.modalCreatedDate}>
                Created: {formatDate(booking.createdAt)}
              </span>
            </div>

            <div className={styles.modalGrid}>
              {/* Customer Information */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>
                  <User className="w-5 h-5" />
                  Customer Details
                </h3>
                <div className={styles.modalSectionContent}>
                  <p><span className={styles.modalLabel}>Name:</span> {booking.customer.fullName}</p>
                  <p><span className={styles.modalLabel}>Email:</span> {booking.customer.email}</p>
                  <p><span className={styles.modalLabel}>Phone:</span> {booking.customer.phone}</p>
                  {booking.customer.message && (
                    <p><span className={styles.modalLabel}>Message:</span> {booking.customer.message}</p>
                  )}
                </div>
              </div>

              {/* Property Information */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>
                  <Home className="w-5 h-5" />
                  Property Details
                </h3>
                <div className={styles.modalSectionContent}>
                  <p><span className={styles.modalLabel}>Property:</span> {getPropertyDisplayName(booking.propertyId)}</p>
                  <p><span className={styles.modalLabel}>Property ID:</span> {booking.propertyId}</p>
                  <p><span className={styles.modalLabel}>Host:</span> {getHostDisplayName(booking.hostId)}</p>
                  <p><span className={styles.modalLabel}>Host ID:</span> {booking.hostId}</p>
                  <p><span className={styles.modalLabel}>Check-in:</span> {formatDate(booking.checkInDate)}</p>
                  <p><span className={styles.modalLabel}>Check-out:</span> {formatDate(booking.checkOutDate)}</p>
                  <p><span className={styles.modalLabel}>Nights:</span> {booking.nights}</p>
                </div>
              </div>

              {/* Guest Information */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Guest Count</h3>
                <div className={styles.modalSectionContent}>
                  <p><span className={styles.modalLabel}>Adults:</span> {booking.guests.adults}</p>
                  <p><span className={styles.modalLabel}>Children:</span> {booking.guests.children}</p>
                  <p><span className={styles.modalLabel}>Infants:</span> {booking.guests.infants}</p>
                </div>
              </div>

              {/* Pricing Information */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>
                  <DollarSign className="w-5 h-5" />
                  Pricing Details
                </h3>
                <div className={styles.modalSectionContent}>
                  <p><span className={styles.modalLabel}>Subtotal:</span> {formatCurrency(booking.pricing.subtotal)}</p>
                  <p><span className={styles.modalLabel}>Service Charge:</span> {formatCurrency(booking.pricing.serviceCharge)}</p>
                  <p><span className={styles.modalLabel}>Tax Amount:</span> {formatCurrency(booking.pricing.taxAmount)}</p>
                  <p className={styles.pricingTotal}><span className={styles.modalLabel}>Total:</span> {formatCurrency(booking.pricing.total)}</p>
                </div>
              </div>
            </div>

            {/* Segments Information */}
            {booking.segments && booking.segments.length > 0 && (
              <div className={styles.segmentsContainer}>
                <h3 className={styles.modalSectionTitle}>Booking Segments</h3>
                <div className={styles.segmentsList}>
                  {booking.segments.map((segment, index) => (
                    <div key={index} className={styles.segmentItem}>
                      <div className={styles.segmentGrid}>
                        <p><span className={styles.modalLabel}>Start:</span> {segment.start_time}</p>
                        <p><span className={styles.modalLabel}>End:</span> {segment.end_time}</p>
                        <p><span className={styles.modalLabel}>Price:</span> {formatCurrency(segment.price)}</p>
                        <p><span className={styles.modalLabel}>Tourist Tax:</span> {formatCurrency(segment.touristTax)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.headerTitle}>Bookings Management</h1>
            <p className={styles.headerSubtitle}>View and manage all property bookings</p>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={styles.filterButton}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={fetchBookings}
              className={styles.refreshButton}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={styles.filtersContainer}>
          <div className={styles.filtersGrid}>
            <div>
              <label className={styles.filterLabel}>Search</label>
              <div className={styles.searchInputContainer}>
                <Search className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Name, email, property, host..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
            <div>
              <label className={styles.filterLabel}>Property ID</label>
              <input
                type="text"
                placeholder="Property ID"
                value={filters.propertyId}
                onChange={(e) => handleFilterChange('propertyId', e.target.value)}
                className={styles.filterInput}
              />
            </div>
            <div>
              <label className={styles.filterLabel}>Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
                <option value="canceled">Canceled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className={styles.filterLabel}>From Date</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className={styles.filterInput}
              />
            </div>
            <div>
              <label className={styles.filterLabel}>To Date</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className={styles.filterInput}
              />
            </div>
          </div>
          <div className={styles.clearFiltersContainer}>
            <button
              onClick={clearFilters}
              className={styles.clearFiltersButton}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Loading indicators */}
      {(loadingProperties || loadingHosts) && (
        <div className={styles.loadingPropertiesIndicator}>
          Loading {loadingProperties && loadingHosts ? 'property and host details' : 
                   loadingProperties ? 'property details' : 'host details'}...
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <XCircle className={styles.errorIcon} />
            <h3 className={styles.errorTitle}>Error Loading Bookings</h3>
            <p className={styles.errorMessage}>{error}</p>
            <button
              onClick={fetchBookings}
              className={styles.errorButton}
            >
              Try Again
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyContainer}>
            <Calendar className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>No Bookings Found</h3>
            <p className={styles.emptyMessage}>No bookings match your current filters.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            {/* Stats */}
            <div className={styles.statsContainer}>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <p className={`${styles.statValue} ${styles.statValuePurple}`}>{bookings.length}</p>
                  <p className={styles.statLabel}>Total Bookings</p>
                </div>
                <div className={styles.statItem}>
                  <p className={`${styles.statValue} ${styles.statValueYellow}`}>
                    {bookings.filter(b => b.status === 'pending').length}
                  </p>
                  <p className={styles.statLabel}>Pending</p>
                </div>
                <div className={styles.statItem}>
                  <p className={`${styles.statValue} ${styles.statValueGreen}`}>
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                  <p className={styles.statLabel}>Confirmed</p>
                </div>
                <div className={styles.statItem}>
                  <p className={`${styles.statValue} ${styles.statValuePurple}`}>
                    {formatCurrency(bookings.reduce((sum, b) => sum + (b.pricing?.total || 0), 0))}
                  </p>
                  <p className={styles.statLabel}>Total Value</p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    <th className={styles.tableHeader}>
                      Customer
                    </th>
                    <th className={styles.tableHeader}>
                      Property
                    </th>
                    <th className={styles.tableHeader}>
                      Dates
                    </th>
                    <th className={styles.tableHeader}>
                      Guests
                    </th>
                    <th className={styles.tableHeader}>
                      Status
                    </th>
                    <th className={styles.tableHeader}>
                      Total
                    </th>
                    <th className={styles.tableHeader}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {bookings.map((booking) => (
                    <tr key={booking._id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <div>
                          <div className={styles.customerName}>
                            {booking.customer.fullName}
                          </div>
                          <div className={styles.customerEmail}>
                            {booking.customer.email}
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.propertyTitle}>
                          {getPropertyDisplayName(booking.propertyId)}
                        </div>
                        <div className={styles.propertyId}>
                          ID: {booking.propertyId}
                        </div>
                        <div className={styles.hostId}>
                          Host: {getHostDisplayName(booking.hostId)}
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.dateText}>
                          {formatDate(booking.checkInDate)}
                        </div>
                        <div className={styles.dateSecondary}>
                          to {formatDate(booking.checkOutDate)}
                        </div>
                        <div className={styles.dateNights}>
                          {booking.nights} nights
                        </div>
                      </td>
                      <td className={`${styles.tableCell} ${styles.guestCount}`}>
                        {booking.guests.adults} adults
                        {booking.guests.children > 0 && `, ${booking.guests.children} children`}
                        {booking.guests.infants > 0 && `, ${booking.guests.infants} infants`}
                      </td>
                      <td className={styles.tableCell}>
                        <span className={`${styles.statusBadge} ${getStatusClass(booking.status)}`}>
                          {getStatusIcon(booking.status)}
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                      <td className={`${styles.tableCell} ${styles.totalAmount}`}>
                        {formatCurrency(booking.pricing.total)}
                      </td>
                      <td className={styles.tableCell}>
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className={styles.viewButton}
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
};

export default AdminBookingsPage;