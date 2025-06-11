// app/layout.js
import { Inter } from 'next/font/google';
import Sidebar from 'components/adminn/Sidebar';
import styles from './adminn.module.css';
import ProtectedRoute from 'components/ProtectedRoute';


export const metadata = {
  title: 'Real Estate Admin Dashboard',
  description: 'Admin dashboard for real estate website generator platform',
};

export default function AdminLayout({ children }) {
  return (
     <ProtectedRoute allowedRoles={['admin']}>
   <div>
      <div className={styles.topBar} />
        <div className={styles.layoutContainer}>
          <Sidebar />
          <main className={styles.mainContent}>
            {children}
          </main>
        </div>
    </div>
    </ProtectedRoute>
  );
}