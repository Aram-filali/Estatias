import styles from './RecentActivity.module.css';

export default function RecentActivity() {
  const activities = [
    { id: 1, user: 'Sarah Johnson', action: 'created a new website', time: '10 minutes ago' },
    { id: 2, user: 'Michael Chen', action: 'added 3 new listings', time: '45 minutes ago' },
    { id: 3, user: 'Lisa Rodriguez', action: 'updated profile information', time: '2 hours ago' },
    { id: 4, user: 'John Smith', action: 'requested website approval', time: '3 hours ago' },
    { id: 5, user: 'Emily Davis', action: 'updated listing photos', time: '5 hours ago' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent Activity</h3>
      </div>
      <ul className={styles.activityList}>
        {activities.map((activity) => (
          <li key={activity.id} className={styles.activityItem}>
            <div className={styles.activityUser}>
              <div className={styles.avatar}>
                {activity.user.split(' ')[0][0]}
              </div>
              <div className={styles.activityDetails}>
                <p className={styles.activityName}>{activity.user}</p>
                <p className={styles.activityAction}>{activity.action}</p>
              </div>
            </div>
            <p className={styles.activityTime}>{activity.time}</p>
          </li>
        ))}
      </ul>
      <div className={styles.header}>
        <button className={styles.viewButton}>
          View all activity
        </button>
      </div>
    </div>
  );
}
