// app/dashboard/notifications/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaHome, FaChartLine, FaCreditCard, FaCog, FaSignOutAlt, FaCheck, FaTrash, FaBell } from 'react-icons/fa';
import styles from './notifications.module.css';

interface Notification {
  id: number;
  text: string;
  isRead: boolean;
  date: string;
  type: 'booking' | 'system' | 'payment';
  actionUrl?: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, text: "New booking request from Alex for Ocean View Property (April 15-20)", isRead: false, date: "10 Apr", type: 'booking', actionUrl: '/dashboard/bookings?id=123' },
    { id: 2, text: "Your trial ends in 5 days. Activate your subscription to continue using all features.", isRead: false, date: "10 Apr", type: 'system', actionUrl: '/dashboard/subscription' },
    { id: 3, text: "Payment successful for April. Your invoice is ready to download.", isRead: true, date: "1 Apr", type: 'payment', actionUrl: '/dashboard/subscription' },
    { id: 4, text: "Maria left a 5-star review for Mountain Cabin. View and respond to the review.", isRead: true, date: "28 Mar", type: 'booking', actionUrl: '#' },
    { id: 5, text: "System maintenance scheduled for March 25, 2025 at 3:00 AM UTC. Service may be unavailable for up to 30 minutes.", isRead: true, date: "20 Mar", type: 'system' },
    { id: 6, text: "New feature: Calendar synchronization with Airbnb and Booking.com is now available!", isRead: true, date: "15 Mar", type: 'system', actionUrl: '/dashboard/settings/integrations' },
    { id: 7, text: "Booking canceled by guest David for Beach House (March 10-15). Cancelation fee applied according to your policy.", isRead: true, date: "5 Mar", type: 'booking', actionUrl: '/dashboard/bookings?id=118' },
    { id: 8, text: "Payment for March has been processed successfully.", isRead: true, date: "1 Mar", type: 'payment', actionUrl: '/dashboard/subscription' }
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      isRead: true
    })));
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, isRead: true } : notification
    ));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  const getNotificationTypeIcon = (type: string) => {
    switch(type) {
      case 'booking':
        return <div className={`${styles.notificationTypeIcon} ${styles.bookingIcon}`}>B</div>;
      case 'system':
        return <div className={`${styles.notificationTypeIcon} ${styles.systemIcon}`}>S</div>;
      case 'payment':
        return <div className={`${styles.notificationTypeIcon} ${styles.paymentIcon}`}>P</div>;
      default:
        return null;
    }
  };

  return (
    <div>
      <header className={styles.header}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Notifications</h1>
        </div>
        <div className={styles.profileSection}>
          {/* Notification bell removed as requested */}
          <div className={styles.profileInfo}>
            <span>John Smith</span>
            <div className={styles.avatar}>J</div>
          </div>
        </div>
      </header>

      <div className={styles.notificationsContainer}>
        <div className={styles.notificationsHeader}>
          <div className={styles.notificationsInfo}>
            You have <span className={styles.unreadCount}>{notifications.filter(n => !n.isRead).length}</span> unread notifications
          </div>
          <div className={styles.notificationsActions}>
            <button 
              className={styles.markAllReadButton}
              onClick={markAllAsRead}
              disabled={notifications.filter(n => !n.isRead).length === 0}
            >
              <FaCheck /> Mark All as Read
            </button>
          </div>
        </div>

        <div className={styles.notificationsFilter}>
          <button className={`${styles.filterButton} ${styles.activeFilter}`}>All</button>
          <button className={styles.filterButton}>Unread</button>
          <button className={styles.filterButton}>Bookings</button>
          <button className={styles.filterButton}>System</button>
          <button className={styles.filterButton}>Payments</button>
        </div>

        <div className={styles.notificationsList}>
          {notifications.length === 0 ? (
            <div className={styles.emptyNotifications}>
              <div className={styles.emptyIcon}>
                <FaBell />
              </div>
              <h3>No Notifications</h3>
              <p>You're all caught up! There are no notifications at this time.</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                {getNotificationTypeIcon(notification.type)}
                <div className={styles.notificationContent}>
                  <p>{notification.text}</p>
                  <span className={styles.notificationDate}>{notification.date}</span>
                </div>
                <div className={styles.notificationActions}>
                  {!notification.isRead && (
                    <button 
                      className={styles.markReadButton} 
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      title="Mark as read"
                    >
                      <FaCheck />
                    </button>
                  )}
                  <button 
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title="Delete notification"
                  >
                    <FaTrash />
                  </button>
                </div>
                {!notification.isRead && (
                  <div className={styles.unreadIndicator}></div>
                )}
              </div>
            ))
          )}
        </div>

        <div className={styles.notificationsPagination}>
          <button className={styles.paginationButton} disabled>Previous</button>
          <span className={styles.paginationInfo}>Page 1 of 1</span>
          <button className={styles.paginationButton} disabled>Next</button>
        </div>

        <section className={styles.notificationPreferences}>
          <h2 className={styles.preferencesTitle}>Notification Preferences</h2>
          <div className={styles.preferencesCard}>
            <div className={styles.preferenceItem}>
              <div className={styles.preferenceInfo}>
                <h3>Email Notifications</h3>
                <p>Receive notifications via email</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={true} onChange={() => {}} />
                <span className={styles.slider}></span>
              </label>
            </div>
            
            <div className={styles.preferenceItem}>
              <div className={styles.preferenceInfo}>
                <h3>Booking Notifications</h3>
                <p>New bookings, cancellations, and guest messages</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={true} onChange={() => {}} />
                <span className={styles.slider}></span>
              </label>
            </div>
            
            <div className={styles.preferenceItem}>
              <div className={styles.preferenceInfo}>
                <h3>Payment Notifications</h3>
                <p>Payment confirmations and invoices</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={true} onChange={() => {}} />
                <span className={styles.slider}></span>
              </label>
            </div>
            
            <div className={styles.preferenceItem}>
              <div className={styles.preferenceInfo}>
                <h3>System Notifications</h3>
                <p>Maintenance, updates, and feature announcements</p>
              </div>
              <label className={styles.switch}>
                <input type="checkbox" checked={true} onChange={() => {}} />
                <span className={styles.slider}></span>
              </label>
            </div>
            
            <button className={styles.primaryButton}>Save Preferences</button>
          </div>
        </section>
      </div>
    </div>
  );
}