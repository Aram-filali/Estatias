'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaBell } from 'react-icons/fa';
import styles from './Dashboard.module.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Interfaces déplacées ici depuis createdashboard.dto.ts
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

interface TrialStatus {
  text: string;
  className: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function DashboardPage() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [host, setHost] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          fetchDashboardData(user.uid, token);
        } catch (err) {
          console.error("Error getting authentication token:", err);
          setError("Authentication error. Please try logging in again.");
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

  const fetchDashboardData = async (hostId: string, token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hosts/dashboard/${hostId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(response.data),
        
      //setHost(response.data.data.profile); // If using the standardized format

      setHost(response.data.profile);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
      setLoading(false);
    }
  };

  const getTrialStatus = (): TrialStatus => {
    if (!host) return { text: '', className: '' };
    if (!host.isTrialActive) return { text: "Trial Expired", className: styles.expired };

    try {
      const daysLeft = Math.ceil(
        (new Date(host.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft <= 2) return { text: `Trial ends in ${daysLeft} days`, className: styles.critical };
      if (daysLeft <= 5) return { text: `Trial ends in ${daysLeft} days`, className: styles.warning };
      return { text: `${daysLeft} days left in trial`, className: styles.active };
    } catch (e) {
      console.error("Error calculating trial days:", e);
      return { text: "Trial Active", className: styles.active };
    }
  };

  /*const toggleNotifications = () => setShowNotifications(!showNotifications);

  const handleNotificationClick = async (notification: Notification) => {
    if (!host || !authToken) return;

    setHost(prev => prev ? {
      ...prev,
      notifications: prev.notifications.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
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
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }

    router.push(notification.actionUrl || '/dashboard/notifications');
  };

  const markAllAsRead = async () => {
    if (!host || !authToken) return;

    const unreadIds = host.notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    setHost(prev => prev ? {
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, isRead: true }))
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
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
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
  };*/
  const redirectToHomePage= async () => {
    router.push("/");
  }

  const redirectToHostWebsite = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user || !host || !authToken) return;
    
    try {
      setLoading(true);
      
      // First get the status
      const statusResponse = await axios.get(`${API_BASE_URL}/site-generator/status`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      console.log("Site status response:", statusResponse.data);
      
      // Simplified site info extraction - look in both running and all collections
      const allSites = [...(statusResponse.data.running || []), ...(statusResponse.data.all || [])];
      const siteInfo = allSites.find(site => site.hostId === user.uid);
      
      console.log("Found site info:", siteInfo);
      
      let response;
      let siteUrl;
      
      // Simplified decision tree
      if (!siteInfo || siteInfo.status === 'error') {
        // No site or site has errors - generate a new one
        console.log("Generating new site");
        response = await axios.post(
          `${API_BASE_URL}/site-generator/${user.uid}/generate`,
          {},
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
      } else if (siteInfo.status === 'ready' && !siteInfo.url) {

        console.log("Starting existing site");
        response = await axios.post(
          `${API_BASE_URL}/site-generator/${user.uid}/start`,
          {},
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
      } else if (siteInfo.url) {
        // Site is already running
        console.log("Site is already running");
        siteUrl = siteInfo.url;
      }
      
      // Get URL from response if we made a request
      if (response && response.data && response.data.url) {
        siteUrl = response.data.url;
      }
      
      if (!siteUrl) {
        throw new Error("Failed to get a valid site URL");
      }
      
      // Open the site in a new tab
      console.log("Opening URL:", siteUrl);
      window.open(siteUrl, '_blank');
    } catch (err) {
      console.error("Error accessing host website:", err);
      setError("Failed to access your booking website. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const trialStatus = host ? getTrialStatus() : { text: '', className: '' };

  if (loading) return <div className={styles.loadingState}></div>;
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
          <h1 className={styles.pageTitle}>Main Dashboard</h1>
        </div>
        <div className={styles.profileSection}>
         {/*} <div className={styles.notificationIcon} onClick={toggleNotifications}>
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
                  <button className={styles.markAllReadButton} onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}>
                    Mark all as read
                  </button>
                </div>
                <div className={styles.notificationPopupList}>
                  {host.notifications?.length === 0 ? (
                    <p>No notifications</p>
                  ) : (
                    host.notifications?.slice(0, 5).map(notification => (
                      <div key={notification.id} className={`${styles.notificationPopupItem} ${!notification.isRead ? styles.unread : ''}`} onClick={(e) => {
                        e.stopPropagation();
                        handleNotificationClick(notification);
                      }}>
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
          </div>*/}
          <div className={styles.profileInfo}>
            <span>{host.name}</span>
            <div className={styles.avatar}>{host.name?.charAt(0) || ''}</div>
          </div>
        </div>
      </header>

      <div className={styles.dashboardContent}>
        <section className={styles.welcomeSection}>
          <h1>Welcome back, {host.name}!</h1>
          <p>Here's an overview of your hosting business</p>
        </section>

        <section className={styles.websiteSection}>
          <div className={styles.websiteCard}>
            <div className={styles.websiteInfo}>
              <h2>Your Booking Website</h2>
              <p className={styles.websiteUrl}>{host.websiteUrl}</p>
              <div className={styles.planBadge}>{host.plan}</div>
              <div className={`${styles.trialBadge} ${trialStatus.className}`}>
                {trialStatus.text}
              </div>
            </div>
            <div className={styles.websiteActions}>
              <button className={styles.primaryButton} onClick={redirectToHostWebsite}>
                View As Guest
              </button>
              <button className={styles.secondaryButton}>Manage my properties</button>
            </div>
          </div>
        </section>

        <section className={styles.statsSection}>

          <div className={styles.statCard}>
            <h3>Revenue</h3>
            <div className={styles.statValue}>${host.revenue}</div>
            <Link href="/dashboard/finances" className={styles.statLink}>Financial Report</Link>
          </div>
        </section>

        <section className={styles.subscriptionSection}>
        <div className={styles.subscriptionCard}>
        <div className={styles.subscriptionInfo}>
          <h2>Subscription Details</h2>
          <div className={styles.subscriptionDetails}>
            <div>
              <span className={styles.label}>Current Plan:</span>
              <span className={styles.value}>{host.plan}</span>
            </div>
            <div>
            <span className={styles.label}>Status:</span>
              <span className={`${styles.value} ${trialStatus.className}`}>
                {host.status} {/* DIRECTEMENT */}
              </span>
            </div>
            {host.isTrialActive && (
              <div>
                <span className={styles.label}>Trial Ends:</span>
                <span className={styles.value}>
                  {new Date(host.trialEndsAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
       {/* <div className={styles.subscriptionActions}>
          {host.isTrialActive && (
            <button className={styles.primaryButton}>Activate Subscription Now</button>
          )}
        </div>*/}
      </div>

        </section>

        <section className={styles.quickActionsSection}>
          <h2>Quick Actions</h2>
          <div className={styles.actionButtonsContainer}>
            <button className={styles.actionButton} onClick={redirectToHostWebsite}>Go to Host Website</button>
            <button className={styles.actionButton}>View Booking Calendar</button>
            <button className={styles.actionButton} onClick={redirectToHomePage}>Go to HomePage</button>
            <button className={styles.actionButton}>Edit Website Content</button>
          </div>
        </section>
      </div>
    </div>
  );
}