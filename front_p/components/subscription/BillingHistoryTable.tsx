'use client';

import styles from 'app/dashboard/subscription/subscription.module.css';
import { BillingHistory } from './types';

interface BillingHistoryTableProps {
  billingHistory: BillingHistory[];
}

export default function BillingHistoryTable({ billingHistory }: BillingHistoryTableProps) {
  const getFeeTypeLabel = (type: string) => {
    switch(type) {
      case 'setup': return 'Website Setup Fee';
      case 'maintenance': return 'Monthly Maintenance';
      case 'transaction': return 'Transaction Fee';
      default: return type;
    }
  };

  return (
    <div className={styles.billingHistoryTable}>
      <div className={styles.tableHeader}>
        <div className={styles.tableCell}>Date</div>
        <div className={styles.tableCell}>Type</div>
        <div className={styles.tableCell}>Amount</div>
        <div className={styles.tableCell}>Status</div>
        <div className={styles.tableCell}>Actions</div>
      </div>
      {billingHistory.map(invoice => (
        <div key={invoice.id} className={styles.tableRow}>
          <div className={styles.tableCell}>{invoice.date}</div>
          <div className={styles.tableCell}>{getFeeTypeLabel(invoice.type)}</div>
          <div className={styles.tableCell}>${invoice.amount}</div>
          <div className={styles.tableCell}>
            <span className={`${styles.statusBadge} ${styles[invoice.status]}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
          <div className={styles.tableCell}>
            <a href={invoice.invoiceUrl} className={styles.downloadLink}>Download</a>
          </div>
        </div>
      ))}
    </div>
  );
}