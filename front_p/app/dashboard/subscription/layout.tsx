'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FaBell } from 'react-icons/fa';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import styles from './subscription.module.css';
import axios from 'axios';

interface Notification {
  id: number;
  text: string;
  date: string;
  type?: string;
  isRead: boolean;
  actionUrl?: string;
}

interface DashboardDto {
  id: string;
  name: string;
  email: string;
  plan: string;
  trialEndsAt: Date;
  isTrialActive: boolean;
  status: string;
  websiteUrl: string;
  notifications: Notification[];
  revenue: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [host, setHost] = useState<DashboardDto | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          await fetchHostData(user.uid, token);
        } catch (err) {
          console.error("Error getting authentication token:", err);
          setError("Authentication error. Please try logging in again.");
        } finally {
          setLoading(false);
        }
      } else {
        setError("You must be logged in to view the dashboard.");
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchHostData = async (hostId: string, token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hosts/dashboard/${hostId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHost(response.data.profile);
    } catch (err) {
      console.error("Error fetching host data:", err);
      setError("Failed to load host data.");
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!host || !authToken) return;

    setHost(prev => prev ? {
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      ),
    } : null);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        await axios.post(`${API_BASE_URL}/hosts/notifications/mark-read`, {
          hostId: user.uid,
          notificationIds: [notification.id],
        }, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }

    router.push(notification.actionUrl || '/dashboard/notifications');
  };

  const markAllAsRead = async () => {
    if (!host || !authToken) return;

    const unreadIds = host.notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    setHost(prev => prev ? {
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
    } : null);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        await axios.post(`${API_BASE_URL}/hosts/notifications/mark-read`, {
          hostId: user.uid,
          notificationIds: unreadIds,
        }, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const getNotificationTypeIcon = (type?: string) => {
    if (!type) return null;

    const iconMap: Record<string, React.ReactNode> = {
      booking: <div className={`${styles.notificationTypeIcon} ${styles.bookingIcon}`}>B</div>,
      system: <div className={`${styles.notificationTypeIcon} ${styles.systemIcon}`}>S</div>,
      payment: <div className={`${styles.notificationTypeIcon} ${styles.paymentIcon}`}>P</div>,
    };

    return iconMap[type] || null;
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!host) {
    return (
      <div className={styles.errorState}>
        <h2>Dashboard access error</h2>
        <p>{error || "Unable to load host data."}</p>
        <button className={styles.primaryButton} onClick={() => router.push('/login')}>
          Return to login page
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className={styles.header}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Subscription Management</h1>
        </div>
        <div className={styles.profileSection}>
          <div className={styles.notificationIcon} onClick={toggleNotifications}>
            <FaBell />
            {host.notifications?.some(n => !n.isRead) && (
              <span className={styles.badge}>
                {host.notifications?.filter(n => !n.isRead).length}
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
                  {host.notifications?.length === 0 ? (
                    <p>No notifications</p>
                  ) : (
                    host.notifications?.slice(0, 5).map(notification => (
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
          <div className={styles.profileInfo}>
            <span>{host.name}</span>
            <div className={styles.avatar}>{host.name?.charAt(0) || ''}</div>
          </div>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
}