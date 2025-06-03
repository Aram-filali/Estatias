'use client';

import { FaBell } from 'react-icons/fa';
import styles from 'app/dashboard/subscription/subscription.module.css';
import { Notification } from './types';

interface NotificationDropdownProps {
  notifications: Notification[];
  showNotifications: boolean;
  toggleNotifications: () => void;
  markAllAsRead: () => void;
  handleNotificationClick: (notification: Notification) => void;
}

export default function NotificationDropdown({
  notifications,
  showNotifications,
  toggleNotifications,
  markAllAsRead,
  handleNotificationClick
}: NotificationDropdownProps) {
  const getNotificationTypeIcon = (type?: string) => {
    if (!type) return null;

    const iconMap: Record<string, React.ReactNode> = {
      booking: <div className={`${styles.notificationTypeIcon} ${styles.bookingIcon}`}>B</div>,
      system: <div className={`${styles.notificationTypeIcon} ${styles.systemIcon}`}>S</div>,
      payment: <div className={`${styles.notificationTypeIcon} ${styles.paymentIcon}`}>P</div>,
    };

    return iconMap[type] || null;
  };

  return (
    <div className={styles.notificationIcon} onClick={toggleNotifications}>
      <FaBell />
      {notifications?.some(n => !n.isRead) && (
        <span className={styles.badge}>
          {notifications?.filter(n => !n.isRead).length}
        </span>
      )}
      {showNotifications && (
        <div className={styles.notificationPopup}>
          <div className={styles.notificationPopupHeader}>
            <h3>Notifications</h3>
            <button
              className={styles.markAllReadButton}
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              Mark all as read
            </button>
          </div>
          <div className={styles.notificationPopupList}>
            {notifications?.length === 0 ? (
              <p>No notifications</p>
            ) : (
              notifications?.slice(0, 5).map(notification => (
                <div
                  key={notification.id}
                  className={`${styles.notificationPopupItem} ${!notification.isRead ? styles.unread : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNotificationClick(notification);
                  }}
                >
                  {getNotificationTypeIcon(notification.type)}
                  <div className={styles.notificationPopupContent}>
                    <p>{notification.text}</p>
                    <span className={styles.notificationPopupDate}>{notification.date}</span>
                  </div>
                  {!notification.isRead && <div className={styles.unreadIndicator}></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}