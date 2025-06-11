// app/dashboard/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaHome, FaChartLine, FaCreditCard, FaBell, FaCog, FaSignOutAlt, FaDownload, FaCalendarAlt, FaUserFriends } from 'react-icons/fa';
import styles from './analytics.module.css';
import axios from 'axios';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface AnalyticsData {
  bookingsByMonth: {
    month: string;
    bookings: number;
  }[];
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
  topReferrers: {
    source: string;
    bookings: number;
    percentage: number;
  }[];
  guestDemographics: {
    country: string;
    percentage: number;
  }[];
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

export default function Analytics() {
  const router = useRouter();
  const [host, setHost] = useState<DashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    bookingsByMonth: [
      { month: 'Jan', bookings: 4 },
      { month: 'Feb', bookings: 6 },
      { month: 'Mar', bookings: 10 },
      { month: 'Apr', bookings: 12 }
    ],
    revenueByMonth: [
      { month: 'Jan', revenue: 850 },
      { month: 'Feb', revenue: 1200 },
      { month: 'Mar', revenue: 1980 },
      { month: 'Apr', revenue: 2450 }
    ],
    topReferrers: [
      { source: 'Direct', bookings: 18, percentage: 42 },
      { source: 'Booking.com', bookings: 12, percentage: 28 },
      { source: 'Google', bookings: 8, percentage: 19 },
      { source: 'Social Media', bookings: 5, percentage: 11 }
    ],
    guestDemographics: [
      { country: 'United States', percentage: 35 },
      { country: 'Canada', percentage: 25 },
      { country: 'United Kingdom', percentage: 15 },
      { country: 'Germany', percentage: 10 },
      { country: 'Other', percentage: 15 }
    ]
  });

  const [dateRange, setDateRange] = useState('last90days');
  const [loading, setLoading] = useState(true);
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

  if (loading) return <div className={styles.loadingState}>Loading...</div>;
  
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
          <h1 className={styles.pageTitle}>Analytics</h1>
        </div>
        <div className={styles.profileSection}>
          
          <div className={styles.profileInfo}>
            <span>{host.name}</span>
            <div className={styles.avatar}>{host.name?.charAt(0) || ''}</div>
          </div>
        </div>
      </header>

      <div className={styles.analyticsDashboard}>
        <div className={styles.analyticsHeader}>
          <div className={styles.dateRangeSelector}>
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className={styles.dateRangeSelect}
            >
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
              <option value="lastyear">Last Year</option>
              <option value="alltime">All Time</option>
            </select>
          </div>
          <button className={styles.exportButton}>
            <FaDownload /> Export Report
          </button>
        </div>

        <div className={styles.analyticsGridContainer}>
          <section className={styles.analyticsCard}>
            <h2 className={styles.analyticsCardTitle}>Bookings Overview</h2>
            <div className={styles.chartContainer}>
              <div className={styles.placeholderChart}>
                {analyticsData.bookingsByMonth.map((data, index) => (
                  <div key={index} className={styles.chartBar} style={{ height: `${data.bookings * 8}px` }}>
                    <span className={styles.chartBarLabel}>{data.bookings}</span>
                  </div>
                ))}
              </div>
              <div className={styles.chartLabels}>
                {analyticsData.bookingsByMonth.map((data, index) => (
                  <div key={index} className={styles.chartLabel}>{data.month}</div>
                ))}
              </div>
            </div>
            <div className={styles.analyticsMetrics}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Total Bookings</span>
                <span className={styles.metricValue}>32</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Avg. Monthly</span>
                <span className={styles.metricValue}>8</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Growth</span>
                <span className={styles.metricValuePositive}>+20%</span>
              </div>
            </div>
          </section>

          <section className={styles.analyticsCard}>
            <h2 className={styles.analyticsCardTitle}>Revenue</h2>
            <div className={styles.chartContainer}>
              <div className={styles.placeholderChart}>
                {analyticsData.revenueByMonth.map((data, index) => (
                  <div key={index} className={styles.chartBar} style={{ height: `${data.revenue / 40}px` }}>
                    <span className={styles.chartBarLabel}>${data.revenue}</span>
                  </div>
                ))}
              </div>
              <div className={styles.chartLabels}>
                {analyticsData.revenueByMonth.map((data, index) => (
                  <div key={index} className={styles.chartLabel}>{data.month}</div>
                ))}
              </div>
            </div>
            <div className={styles.analyticsMetrics}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Total Revenue</span>
                <span className={styles.metricValue}>$6,480</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Avg. Monthly</span>
                <span className={styles.metricValue}>$1,620</span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Growth</span>
                <span className={styles.metricValuePositive}>+24%</span>
              </div>
            </div>
          </section>
        </div>

        <section className={styles.analyticsActions}>
          <h2>Analytics Actions</h2>
          <div className={styles.actionButtonsContainer}>
            <button className={styles.actionButton}>
              <FaCalendarAlt /> View Seasonal Trends
            </button>
            <button className={styles.actionButton}>
              <FaUserFriends /> Guest Behavior Analysis
            </button>
            <button className={styles.actionButton}>
              <FaDownload /> Download Full Report
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}