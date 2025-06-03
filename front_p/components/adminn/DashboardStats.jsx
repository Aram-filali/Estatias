import styles from './DashboardStats.module.css';

export default function DashboardStats() {
  const stats = [
    { name: 'Total Hosts', value: '245', change: '+12%', changeType: 'increase' },
    { name: 'Pending Websites', value: '18', change: '-3%', changeType: 'decrease' },
    { name: 'Active Listings', value: '872', change: '+5%', changeType: 'increase' },
    { name: 'Website Views', value: '12.4k', change: '+18%', changeType: 'increase' },
  ];

  return (
    <div className={styles.container}>
      {stats.map((stat) => (
        <div key={stat.name} className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.cardHeader}>
              <div className={styles.cardText}>
                <div className={styles.cardTitle}>{stat.name}</div>
                <div className={styles.cardValue}>{stat.value}</div>
              </div>
              <div
                className={`${styles.change} ${
                  stat.changeType === 'increase' ? styles.increase : styles.decrease
                }`}
              >
                {stat.change}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
