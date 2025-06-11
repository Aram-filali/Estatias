import DashboardStats from 'components/adminn/DashboardStats';
import RecentActivity from 'components/adminn/RecentActivity';
import styles from './adminn.module.css';

export default function Dashboard() {
  return (
   
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <span className={styles.date}>Last updated: April 11, 2025</span>
      </div>

      <DashboardStats />
      <RecentActivity />
    </div>

  );
}
