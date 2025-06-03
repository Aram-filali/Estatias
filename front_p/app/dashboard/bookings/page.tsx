// app/dashboard/bookings/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaHome, FaChartLine, FaCreditCard, FaBell, FaCog, FaSignOutAlt, 
         FaCheck, FaTimes, FaEye, FaFilter, FaSort, FaCalendarAlt } from 'react-icons/fa';
import styles from '../Dashboard.module.css';
import bookingStyles from './bookings.module.css';

interface Booking {
  id: number;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  guests: number;
  phoneNumber: string;
  email: string;
  specialRequests?: string;
  createdAt: Date;
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: 1,
      guestName: "Maria Johnson",
      checkIn: new Date(2025, 3, 15),
      checkOut: new Date(2025, 3, 20),
      price: 780,
      status: 'confirmed',
      guests: 2,
      phoneNumber: "555-123-4567",
      email: "maria@example.com",
      createdAt: new Date(2025, 2, 10)
    },
    {
      id: 2,
      guestName: "David Lee",
      checkIn: new Date(2025, 3, 12),
      checkOut: new Date(2025, 3, 14),
      price: 320,
      status: 'pending',
      guests: 1,
      phoneNumber: "555-987-6543",
      email: "david@example.com",
      specialRequests: "Late check-in around 10pm",
      createdAt: new Date(2025, 3, 5)
    },
    {
      id: 3,
      guestName: "Sarah Williams",
      checkIn: new Date(2025, 4, 1),
      checkOut: new Date(2025, 4, 7),
      price: 1200,
      status: 'confirmed',
      guests: 4,
      phoneNumber: "555-222-3333",
      email: "sarah@example.com",
      specialRequests: "Early check-in if possible",
      createdAt: new Date(2025, 3, 8)
    },
    {
      id: 4,
      guestName: "Robert Chen",
      checkIn: new Date(2025, 3, 5),
      checkOut: new Date(2025, 3, 10),
      price: 850,
      status: 'completed',
      guests: 2,
      phoneNumber: "555-444-5555",
      email: "robert@example.com",
      createdAt: new Date(2025, 2, 15)
    },
    {
      id: 5,
      guestName: "Emma Garcia",
      checkIn: new Date(2025, 5, 12),
      checkOut: new Date(2025, 5, 15),
      price: 540,
      status: 'confirmed',
      guests: 3,
      phoneNumber: "555-666-7777",
      email: "emma@example.com",
      createdAt: new Date(2025, 3, 2)
    },
    {
      id: 6,
      guestName: "Michael Brown",
      checkIn: new Date(2025, 3, 18),
      checkOut: new Date(2025, 3, 20),
      price: 390,
      status: 'cancelled',
      guests: 2,
      phoneNumber: "555-888-9999",
      email: "michael@example.com",
      specialRequests: "Room with a view",
      createdAt: new Date(2025, 3, 1)
    }
  ]);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('checkIn');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const openBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const closeBookingDetails = () => {
    setShowDetailsModal(false);
  };

  const confirmBooking = (id: number) => {
    setBookings(bookings.map(booking => 
      booking.id === id ? { ...booking, status: 'confirmed' } : booking
    ));
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking({ ...selectedBooking, status: 'confirmed' });
    }
  };

  const cancelBooking = (id: number) => {
    setBookings(bookings.map(booking => 
      booking.id === id ? { ...booking, status: 'cancelled' } : booking
    ));
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking({ ...selectedBooking, status: 'cancelled' });
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusClass = (status: string): string => {
    switch(status) {
      case 'pending': return bookingStyles.statusPending;
      case 'confirmed': return bookingStyles.statusConfirmed;
      case 'cancelled': return bookingStyles.statusCancelled;
      case 'completed': return bookingStyles.statusCompleted;
      default: return '';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    // Filter by status if not "all"
    if (filterStatus !== 'all' && booking.status !== filterStatus) {
      return false;
    }
    
    // Filter by search term (guest name or booking ID)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        booking.guestName.toLowerCase().includes(searchLower) ||
        booking.id.toString().includes(searchTerm) ||
        booking.email.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Sort the filtered bookings
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let compareResult = 0;
    
    if (sortBy === 'checkIn') {
      compareResult = a.checkIn.getTime() - b.checkIn.getTime();
    } else if (sortBy === 'price') {
      compareResult = a.price - b.price;
    } else if (sortBy === 'guestName') {
      compareResult = a.guestName.localeCompare(b.guestName);
    } else if (sortBy === 'createdAt') {
      compareResult = a.createdAt.getTime() - b.createdAt.getTime();
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

  return (
    <div>
        <header className={styles.header}>
        <div className={styles.pageTitleContainer}>
            <h1 className={styles.pageTitle}>Bookings</h1>
          </div>
          <div className={styles.profileSection}>
            <div className={styles.profileInfo}>
              <span>John Smith</span>
              <div className={styles.avatar}>J</div>
            </div>
          </div>
        </header>

        <div className={bookingStyles.bookingsContent}>
          <section className={bookingStyles.bookingsHeader}>
            <h1>Bookings Management</h1>
            <div className={bookingStyles.bookingsActions}>
              <div className={bookingStyles.filterContainer}>
                <FaFilter />
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={bookingStyles.filterSelect}
                >
                  <option value="all">All Bookings</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <button className={bookingStyles.createButton}>
                <FaCalendarAlt /> Add Manual Booking
              </button>
            </div>
          </section>

          <section className={bookingStyles.bookingsTable}>
            <div className={bookingStyles.tableHeader}>
              <div className={bookingStyles.idColumn}>
                ID
              </div>
              <div 
                className={bookingStyles.nameColumn}
                onClick={() => toggleSort('guestName')}
              >
                Guest Name
                {sortBy === 'guestName' && (
                  <FaSort className={bookingStyles.sortIcon} />
                )}
              </div>
              <div 
                className={bookingStyles.dateColumn}
                onClick={() => toggleSort('checkIn')}
              >
                Check-in / Check-out
                {sortBy === 'checkIn' && (
                  <FaSort className={bookingStyles.sortIcon} />
                )}
              </div>
              <div 
                className={bookingStyles.priceColumn}
                onClick={() => toggleSort('price')}
              >
                Price
                {sortBy === 'price' && (
                  <FaSort className={bookingStyles.sortIcon} />
                )}
              </div>
              <div className={bookingStyles.statusColumn}>
                Status
              </div>
              <div className={bookingStyles.actionsColumn}>
                Actions
              </div>
            </div>

            <div className={bookingStyles.tableBody}>
              {sortedBookings.length > 0 ? (
                sortedBookings.map(booking => (
                  <div key={booking.id} className={bookingStyles.tableRow}>
                    <div className={bookingStyles.idColumn}>#{booking.id}</div>
                    <div className={bookingStyles.nameColumn}>
                      <div className={bookingStyles.guestName}>{booking.guestName}</div>
                      <div className={bookingStyles.guestEmail}>{booking.email}</div>
                    </div>
                    <div className={bookingStyles.dateColumn}>
                      <div>{formatDate(booking.checkIn)}</div>
                      <div>to</div>
                      <div>{formatDate(booking.checkOut)}</div>
                    </div>
                    <div className={bookingStyles.priceColumn}>${booking.price}</div>
                    <div className={bookingStyles.statusColumn}>
                      <span className={`${bookingStyles.statusBadge} ${getStatusClass(booking.status)}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                    <div className={bookingStyles.actionsColumn}>
                      <button 
                        className={bookingStyles.viewButton}
                        onClick={() => openBookingDetails(booking)}
                      >
                        <FaEye />
                      </button>
                      {booking.status === 'pending' && (
                        <>
                          <button 
                            className={bookingStyles.confirmButton}
                            onClick={() => confirmBooking(booking.id)}
                          >
                            <FaCheck />
                          </button>
                          <button 
                            className={bookingStyles.cancelButton}
                            onClick={() => cancelBooking(booking.id)}
                          >
                            <FaTimes />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={bookingStyles.noBookings}>
                  No bookings found matching your filters.
                </div>
              )}
            </div>
          </section>

          {showDetailsModal && selectedBooking && (
            <div className={bookingStyles.modalOverlay}>
              <div className={bookingStyles.modal}>
                <div className={bookingStyles.modalHeader}>
                  <h2>Booking Details #{selectedBooking.id}</h2>
                  <button 
                    className={bookingStyles.closeButton}
                    onClick={closeBookingDetails}
                  >
                    ✕
                  </button>
                </div>
                <div className={bookingStyles.modalContent}>
                  <div className={bookingStyles.detailsGrid}>
                    <div className={bookingStyles.detailsSection}>
                      <h3>Guest Information</h3>
                      <div className={bookingStyles.detailItem}>
                        <span className={bookingStyles.detailLabel}>Name:</span>
                        <span className={bookingStyles.detailValue}>{selectedBooking.guestName}</span>
                      </div>
                      <div className={bookingStyles.detailItem}>
                        <span className={bookingStyles.detailLabel}>Email:</span>
                        <span className={bookingStyles.detailValue}>{selectedBooking.email}</span>
                      </div>
                      <div className={bookingStyles.detailItem}>
                        <span className={bookingStyles.detailLabel}>Phone:</span>
                        <span className={bookingStyles.detailValue}>{selectedBooking.phoneNumber}</span>
                      </div>
                      <div className={bookingStyles.detailItem}>
                        <span className={bookingStyles.detailLabel}>Guests:</span>
                        <span className={bookingStyles.detailValue}>{selectedBooking.guests}</span>
                      </div>
                    </div>

                    <div className={bookingStyles.detailsSection}>
                      <h3>Booking Information</h3>
                      <div className={bookingStyles.detailItem}>
                        <span className={bookingStyles.detailLabel}>Check-in:</span>
                        <span className={bookingStyles.detailValue}>{formatDate(selectedBooking.checkIn)}</span>
                      </div>
                      <div className={bookingStyles.detailItem}>
                        <span className={bookingStyles.detailLabel}>Check-out:</span>
                        <span className={bookingStyles.detailValue}>{formatDate(selectedBooking.checkOut)}</span>
                      </div>
                      <div className={bookingStyles.detailItem}>
                        <span className={bookingStyles.detailLabel}>Status:</span>
                        <span className={`${bookingStyles.statusBadge} ${getStatusClass(selectedBooking.status)}`}>
                          {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                        </span>
                      </div>
                      <div className={bookingStyles.detailItem}>
                        <span className={bookingStyles.detailLabel}>Total Price:</span>
                        <span className={bookingStyles.detailValue}>${selectedBooking.price}</span>
                      </div>
                      <div className={bookingStyles.detailItem}>
                        <span className={bookingStyles.detailLabel}>Booking Date:</span>
                        <span className={bookingStyles.detailValue}>{formatDate(selectedBooking.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedBooking.specialRequests && (
                    <div className={bookingStyles.specialRequests}>
                      <h3>Special Requests</h3>
                      <p>{selectedBooking.specialRequests}</p>
                    </div>
                  )}
                  
                  <div className={bookingStyles.modalActions}>
                    {selectedBooking.status === 'pending' && (
                      <>
                        <button 
                          className={bookingStyles.confirmButtonLarge}
                          onClick={() => {
                            confirmBooking(selectedBooking.id);
                            closeBookingDetails();
                          }}
                        >
                          <FaCheck /> Confirm Booking
                        </button>
                        <button 
                          className={bookingStyles.cancelButtonLarge}
                          onClick={() => {
                            cancelBooking(selectedBooking.id);
                            closeBookingDetails();
                          }}
                        >
                          <FaTimes /> Cancel Booking
                        </button>
                      </>
                    )}
                    <button 
                      className={bookingStyles.printButton}
                      onClick={() => window.print()}
                    >
                      Print Booking Details
                    </button>
                    <button 
                      className={bookingStyles.emailButton}
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