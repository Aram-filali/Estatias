'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaFilter, FaSort, FaCalendarAlt, FaEye, FaCheck, FaTimes, FaHome } from 'react-icons/fa';
import styles from './bookings.module.css';

interface Guest {
  adults: number;
  children?: number;
  infants?: number;
}

interface Pricing {
  total: number;
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
}

interface Customer {
  fullName: string;
  email: string;
  phone: string;
  message?: string;
  additionalMessage?: string;
}

interface Booking {
  _id: string;
  propertyId: string;
  hostId: string; 
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: Guest;
  pricing: Pricing;
  customer: Customer;
  status: 'pending'  | 'approved' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';
  createdAt: string;
}

interface Property {
  _id: string;
  title: string;
  // Add other property fields as needed
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('checkInDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [updateLoading, setUpdateLoading] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Get property name by ID
  const getPropertyName = (propertyId: string): string => {
    const property = properties.find(prop => prop._id === propertyId);
    if (property) return property.title;
    
    console.warn(`Property with ID ${propertyId} not found in loaded properties`);
    return 'Unknown Property';
  };

  // First fetch properties, then fetch bookings
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const hostId = process.env.NEXT_PUBLIC_HOST_ID;
        console.log("Using hostId:", hostId);

        if (!hostId) {
          console.error("Host ID not found in environment variables");
          setLoading(false);
          return;
        }

        // First fetch properties
        console.log(`Fetching properties for host: ${hostId}`);
        const propertiesResponse = await fetch(`${baseUrl}/properties/host/${hostId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!propertiesResponse.ok) {
          throw new Error(`HTTP error fetching properties! status: ${propertiesResponse.status}`);
        }

        const propertiesData = await propertiesResponse.json();
        const propertiesList = propertiesData.data || propertiesData;
        console.log(`Fetched ${propertiesList.length} properties:`, propertiesList);
        setProperties(propertiesList);

        // Then fetch bookings
         console.log(`Fetching bookings for host: ${hostId}`);
        const bookingsResponse = await fetch(`${baseUrl}/bookings/host/${hostId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!bookingsResponse.ok) {
          throw new Error(`HTTP error fetching bookings! status: ${bookingsResponse.status}`);
        }

        const bookingsData = await bookingsResponse.json();
        const bookingsList = bookingsData.data || bookingsData;
        console.log(`Fetched ${bookingsList.length} bookings:`, bookingsList);

        // Check if bookings have the correct hostId
        const validBookings = bookingsList.filter((booking: Booking) => booking.hostId === hostId);
        if (validBookings.length !== bookingsList.length) {
          console.warn(`Filtered out ${bookingsList.length - validBookings.length} bookings that don't match hostId ${hostId}`);
        }
        
        setBookings(validBookings);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [baseUrl]);

  const openBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const closeBookingDetails = () => {
    setShowDetailsModal(false);
  };

  const updateBookingStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    setUpdateLoading(true);
    try {
      const response = await fetch(`${baseUrl}/bookings/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Update local state after successful API call
      setBookings(bookings.map(booking => 
        booking._id === id ? { ...booking, status: newStatus } : booking
      ));
      
      if (selectedBooking && selectedBooking._id === id) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }

      return true;
    } catch (err) {
      console.error(`Error updating booking status to ${newStatus}:`, err);
      setError(`Failed to update booking status. ${(err as Error).message}`);
      return false;
    } finally {
      setUpdateLoading(false);
    }
  };

  const confirmBooking = async (id: string) => {
    const success = await updateBookingStatus(id, 'approved');
    if (success && selectedBooking && selectedBooking._id === id) {
      closeBookingDetails();
    }
  };

  const rejectBooking = async (id: string) => {
    const success = await updateBookingStatus(id, 'rejected');
    if (success && selectedBooking && selectedBooking._id === id) {
      closeBookingDetails();
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusClass = (status: string): string => {
    switch(status) {
      case 'pending': return styles.statusPending;
      case 'approved': return styles.statusApproved;
      case 'confirmed': return styles.statusConfirmed;
      case 'rejected': return styles.statusRejected;
      case 'cancelled': return styles.statusCancelled;
      case 'completed': return styles.statusCompleted;
      default: return '';
    }
  };

  // Filter bookings
  const filteredBookings = bookings.filter(booking => {
    // Filter by status if not "all"
    if (filterStatus !== 'all' && booking.status !== filterStatus) {
      return false;
    }
    
    // Filter by property if not "all"
    if (filterProperty !== 'all' && booking.propertyId !== filterProperty) {
      return false;
    }
    
    // Filter by search term (guest name, booking ID, email, or property name)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const propertyName = getPropertyName(booking.propertyId).toLowerCase();
      
      return (
        booking.customer.fullName.toLowerCase().includes(searchLower) ||
        booking._id.toLowerCase().includes(searchLower) ||
        booking.customer.email.toLowerCase().includes(searchLower) ||
        propertyName.includes(searchLower)
      );
    }
    
    return true;
  });

  // Sort the filtered bookings
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let compareResult = 0;
    
    if (sortBy === 'checkInDate') {
      compareResult = new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime();
    } else if (sortBy === 'total') {
      compareResult = a.pricing.total - b.pricing.total;
    } else if (sortBy === 'fullName') {
      compareResult = a.customer.fullName.localeCompare(b.customer.fullName);
    } else if (sortBy === 'createdAt') {
      compareResult = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === 'propertyName') {
      const aName = getPropertyName(a.propertyId);
      const bName = getPropertyName(b.propertyId);
      compareResult = aName.localeCompare(bName);
    }
    
    return sortDirection === 'asc' ? compareResult : -compareResult;
  });

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  if (loading && (bookings.length === 0 || properties.length === 0)) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading bookings...</p>
      </div>
    );
  }

  if (error && bookings.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.bookingsContainer}>
      <div className={styles.bookingsContent}>
        <section className={styles.bookingsHeader}>
          <h1>Bookings Management</h1>
          <div className={styles.bookingsActions}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search by name, email, property or ID..."
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.filterContainer}>
              <FaFilter className={styles.filterIcon} />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All booking states</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className={styles.filterContainer}>
              <FaHome className={styles.filterIcon} />
              <select 
                value={filterProperty} 
                onChange={(e) => setFilterProperty(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Properties</option>
                {properties.map(property => (
                  <option key={property._id} value={property._id}>
                    {property.title}
                  </option>
                ))}
              </select>
            </div>
            {/*<button className={styles.createButton}>
              <FaCalendarAlt /> Add Manual Booking
            </button>*/}
          </div>
        </section>

        {error && (
          <div className={styles.errorBanner}>
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <section className={styles.bookingsTable}>
          <div className={styles.tableHeader}>
            <div className={styles.idColumn}>
              ID
            </div>
            <div 
              className={styles.nameColumn}
              onClick={() => toggleSort('fullName')}
            >
              Guest Name
              {sortBy === 'fullName' && (
                <FaSort className={styles.sortIcon} />
              )}
            </div>
            <div 
              className={styles.propertyColumn}
              onClick={() => toggleSort('propertyName')}
            >
              Property
              {sortBy === 'propertyName' && (
                <FaSort className={styles.sortIcon} />
              )}
            </div>
            <div 
              className={styles.dateColumn}
              onClick={() => toggleSort('checkInDate')}
            >
              Check-in / Check-out
              {sortBy === 'checkInDate' && (
                <FaSort className={styles.sortIcon} />
              )}
            </div>
            <div 
              className={styles.priceColumn}
              onClick={() => toggleSort('total')}
            >
              Booking Price
              {sortBy === 'total' && (
                <FaSort className={styles.sortIcon} />
              )}
            </div>
            <div className={styles.statusColumn}>
              Status
            </div>
            <div className={styles.actionsColumn}>
              Actions
            </div>
          </div>

          <div className={styles.tableBody}>
            {sortedBookings.length > 0 ? (
              sortedBookings.map(booking => (
                <div key={booking._id} className={styles.tableRow}>
                  <div className={styles.idColumn}>#{booking._id.substring(0, 8)}</div>
                  <div className={styles.nameColumn}>
                    <div className={styles.guestName}>{booking.customer.fullName}</div>
                    <div className={styles.guestEmail}>{booking.customer.email}</div>
                  </div>
                  <div className={styles.propertyColumn}>
                    {getPropertyName(booking.propertyId)}
                  </div>
                  <div className={styles.dateColumn}>
                    <div>{formatDate(booking.checkInDate)}</div>
                    <div>to</div>
                    <div>{formatDate(booking.checkOutDate)}</div>
                  </div>
                  <div className={styles.priceColumn}>${booking.pricing.total}</div>
                  <div className={styles.statusColumn}>
                    <span className={`${styles.statusBadge} ${getStatusClass(booking.status)}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>
                  <div className={styles.actionsColumn}>
                    <button 
                      className={styles.viewButton}
                      onClick={() => openBookingDetails(booking)}
                      aria-label="View details"
                    >
                      <FaEye />
                    </button>
                    {booking.status === 'pending' && (
                      <>
                        <button 
                          className={styles.confirmButton}
                          onClick={() => confirmBooking(booking._id)}
                          disabled={updateLoading}
                          aria-label="Confirm booking"
                        >
                          <FaCheck />
                        </button>
                        <button 
                          className={styles.rejectButton}
                          onClick={() => rejectBooking(booking._id)}
                          disabled={updateLoading}
                          aria-label="Reject booking"
                        >
                          <FaTimes />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noBookings}>
                No bookings found matching your filters.
              </div>
            )}
          </div>
        </section>

        {showDetailsModal && selectedBooking && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2>Booking Details #{selectedBooking._id.substring(0, 8)}</h2>
                <button 
                  className={styles.closeButton}
                  onClick={closeBookingDetails}
                  aria-label="Close details"
                >
                  ✕
                </button>
              </div>
              <div className={styles.modalContent}>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailsSection}>
                    <h3>Guest Information</h3>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Name:</span>
                      <span className={styles.detailValue}>{selectedBooking.customer.fullName}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Email:</span>
                      <span className={styles.detailValue}>{selectedBooking.customer.email}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Phone:</span>
                      <span className={styles.detailValue}>{selectedBooking.customer.phone}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Guests:</span>
                      <span className={styles.detailValue}>
                        {selectedBooking.guests.adults} adults
                        {selectedBooking.guests.children ? `, ${selectedBooking.guests.children} children` : ''}
                        {selectedBooking.guests.infants ? `, ${selectedBooking.guests.infants} infants` : ''}
                      </span>
                    </div>
                  </div>

                  <div className={styles.detailsSection}>
                    <h3>Booking Information</h3>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Property:</span>
                      <span className={styles.detailValue}>{getPropertyName(selectedBooking.propertyId)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Check-in:</span>
                      <span className={styles.detailValue}>{formatDate(selectedBooking.checkInDate)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Check-out:</span>
                      <span className={styles.detailValue}>{formatDate(selectedBooking.checkOutDate)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Nights:</span>
                      <span className={styles.detailValue}>{selectedBooking.nights}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Status:</span>
                      <span className={`${styles.statusBadge} ${getStatusClass(selectedBooking.status)}`}>
                        {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Booking Date:</span>
                      <span className={styles.detailValue}>{formatDate(selectedBooking.createdAt)}</span>
                    </div>
                  </div>
                </div>
                
                <div className={styles.priceDetailsSection}>
                  <h3>Price Breakdown</h3>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Subtotal:</span>
                    <span className={styles.detailValue}>${selectedBooking.pricing.subtotal}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Service Charge:</span>
                    <span className={styles.detailValue}>${selectedBooking.pricing.serviceCharge}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Tax:</span>
                    <span className={styles.detailValue}>${selectedBooking.pricing.taxAmount}</span>
                  </div>
                  <div className={`${styles.detailItem} ${styles.totalPrice}`}>
                    <span className={styles.detailLabel}>Total Price:</span>
                    <span className={styles.detailValue}>${selectedBooking.pricing.total}</span>
                  </div>
                </div>
                
                {(selectedBooking.customer.message || selectedBooking.customer.additionalMessage) && (
                  <div className={styles.messageSection}>
                    <h3>Messages</h3>
                    {selectedBooking.customer.message && (
                      <div className={styles.message}>
                        <h4>Guest Message:</h4>
                        <p>{selectedBooking.customer.message}</p>
                      </div>
                    )}
                    {selectedBooking.customer.additionalMessage && (
                      <div className={styles.message}>
                        <h4>Additional Message:</h4>
                        <p>{selectedBooking.customer.additionalMessage}</p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className={styles.modalActions}>
                  {selectedBooking.status === 'pending' && (
                    <>
                      <button 
                        className={styles.confirmButtonLarge}
                        onClick={() => confirmBooking(selectedBooking._id)}
                        disabled={updateLoading}
                      >
                        <FaCheck /> Approve Booking
                      </button>
                      <button 
                        className={styles.rejectButtonLarge}
                        onClick={() => rejectBooking(selectedBooking._id)}
                        disabled={updateLoading}
                      >
                        <FaTimes /> Reject Booking
                      </button>
                    </>
                  )}
                  <button 
                    className={styles.printButton}
                    onClick={() => window.print()}
                  >
                    Print Booking Details
                  </button>
                  <button 
                    className={styles.emailButton}
                    onClick={() => window.open(`mailto:${selectedBooking.customer.email}`)}
                  >
                    Email Guest
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}