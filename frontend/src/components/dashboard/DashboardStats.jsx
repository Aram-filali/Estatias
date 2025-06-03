// app/dashboard/components/DashboardStats.jsx
import { Home, Calendar, DollarSign, Users, Lock } from 'lucide-react';
import styles from './DashboardStats.module.css';

export default function DashboardStats({ listings }) {
  // Calculate statistics
  const totalListings = listings.length;
  const availableListings = listings.filter(l => l.status === 'available').length;

  const bookedListings = listings.filter(l => l.status === 'booked').length;
  
  // Calculate average price
  const totalPrice = listings.reduce((sum, listing) => sum + listing.price, 0);
  const avgPrice = totalListings > 0 ? Math.round(totalPrice / totalListings) : 0;
  
  // Calculate total capacity
  const totalCapacity = listings.reduce((sum, listing) => sum + Number(listing.maxGuest || 0), 0);
  
  return (
    <div className={styles.statsContainer}>
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper}>
          <Home size={24} className={styles.statIcon} />
        </div>
        <div className={styles.statContent}>
          <h3 className={styles.statValue}>{totalListings}</h3>
          <p className={styles.statLabel}>Total Listings</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper}>
          <Calendar size={24} className={styles.statIcon} />
        </div>
        <div className={styles.statContent}>
          <h3 className={styles.statValue}>{availableListings}</h3>
          <p className={styles.statLabel}>Available Listings</p>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIconWrapper}>
          <Lock size={24} className={styles.statIcon} />
        </div>
        <div className={styles.statContent}>
          <h3 className={styles.statValue}>{bookedListings}</h3>
          <p className={styles.statLabel}>Booked Listings</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper}>
          <DollarSign size={24} className={styles.statIcon} />
        </div>
        <div className={styles.statContent}>
          <h3 className={styles.statValue}>${avgPrice}</h3>
          <p className={styles.statLabel}>Average Price</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIconWrapper}>
          <Users size={24} className={styles.statIcon} />
        </div>
        <div className={styles.statContent}>
          <h3 className={styles.statValue}>{totalCapacity}</h3>
          <p className={styles.statLabel}>Total Capacity</p>
        </div>
      </div>
    </div>
  );
}