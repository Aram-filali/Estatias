// app/dashboard/finances/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaHome, FaChartLine, FaCreditCard, FaBell, FaCog, FaSignOutAlt, 
         FaDownload, FaFilter, FaCalendarAlt, FaMoneyBillWave, FaChevronDown, 
         FaChevronUp, FaCreditCard as FaCCard, FaReceipt } from 'react-icons/fa';
import styles from '../Dashboard.module.css';
import financeStyles from './Finances.module.css';

interface Transaction {
  id: number;
  date: Date;
  description: string;
  amount: number;
  type: 'booking' | 'payout' | 'refund' | 'fee';
  status: 'completed' | 'pending' | 'failed';
  bookingId?: number;
  paymentMethod?: string;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export default function FinancesPage() {
  const router = useRouter();
  
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 1,
      date: new Date(2025, 3, 8),
      description: "Booking payment - Maria Johnson",
      amount: 780,
      type: 'booking',
      status: 'completed',
      bookingId: 1,
      paymentMethod: "Credit Card"
    },
    {
      id: 2,
      date: new Date(2025, 3, 5),
      description: "Booking payment - Robert Chen",
      amount: 850,
      type: 'booking',
      status: 'completed',
      bookingId: 4,
      paymentMethod: "PayPal"
    },
    {
      id: 3,
      date: new Date(2025, 3, 1),
      description: "Monthly payout",
      amount: -1950,
      type: 'payout',
      status: 'completed',
    },
    {
      id: 4,
      date: new Date(2025, 3, 2),
      description: "Booking payment - Emma Garcia",
      amount: 540,
      type: 'booking',
      status: 'completed',
      bookingId: 5,
      paymentMethod: "Credit Card"
    },
    {
      id: 5,
      date: new Date(2025, 3, 1),
      description: "Platform fee",
      amount: -97.5,
      type: 'fee',
      status: 'completed',
    },
    {
      id: 6,
      date: new Date(2025, 2, 25),
      description: "Booking payment - Michael Brown",
      amount: 390,
      type: 'booking',
      status: 'completed',
      bookingId: 6,
      paymentMethod: "Credit Card"
    },
    {
      id: 7,
      date: new Date(2025, 2, 28),
      description: "Refund - Cancelled booking",
      amount: -390,
      type: 'refund',
      status: 'completed',
      bookingId: 6,
    },
    {
      id: 8,
      date: new Date(2025, 2, 10),
      description: "Booking payment - Maria Johnson",
      amount: 780,
      type: 'booking',
      status: 'pending',
      bookingId: 1,
      paymentMethod: "Bank Transfer"
    }
  ]);

  const [monthlyRevenue] = useState<MonthlyRevenue[]>([
    { month: "Jan", revenue: 1200 },
    { month: "Feb", revenue: 1800 },
    { month: "Mar", revenue: 2650 },
    { month: "Apr", revenue: 2170 }
  ]);

  const [filterTimeframe, setFilterTimeframe] = useState<string>('thisMonth');
  const [filterType, setFilterType] = useState<string>('all');
  const [showCards, setShowCards] = useState(true);
  
  const calculateTotalRevenue = (): number => {
    return transactions
      .filter(t => t.type === 'booking' && t.status === 'completed')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };
  
  const calculateTotalPendingRevenue = (): number => {
    return transactions
      .filter(t => t.type === 'booking' && t.status === 'pending')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };
  
  const calculateTotalPaidOut = (): number => {
    return Math.abs(transactions
      .filter(t => t.type === 'payout' && t.status === 'completed')
      .reduce((sum, transaction) => sum + transaction.amount, 0));
  };

  const calculateBalance = (): number => {
    return transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getTransactionTypeClass = (type: string): string => {
    switch(type) {
      case 'booking': return financeStyles.typeBooking;
      case 'payout': return financeStyles.typePayout;
      case 'refund': return financeStyles.typeRefund;
      case 'fee': return financeStyles.typeFee;
      default: return '';
    }
  };

  const getStatusClass = (status: string): string => {
    switch(status) {
      case 'completed': return financeStyles.statusCompleted;
      case 'pending': return financeStyles.statusPending;
      case 'failed': return financeStyles.statusFailed;
      default: return '';
    }
  };

  const getFilteredTransactions = (): Transaction[] => {
    let filtered = [...transactions];
    
    // Apply timeframe filter
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    if (filterTimeframe === 'thisMonth') {
      filtered = filtered.filter(t => t.date >= firstDayOfMonth);
    } else if (filterTimeframe === 'lastMonth') {
      filtered = filtered.filter(t => t.date >= firstDayOfLastMonth && t.date < firstDayOfMonth);
    } else if (filterTimeframe === 'last3Months') {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      filtered = filtered.filter(t => t.date >= threeMonthsAgo);
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const downloadReport = () => {
    alert("Downloading financial report...");
    // In a real application, this would generate and download a CSV or PDF
  };

  return (
    <div >

        <header className={styles.header}>
          <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Financial Overview</h1>
          </div>
          <div className={styles.profileSection}>
            <div className={styles.profileInfo}>
              <span>John Smith</span>
              <div className={styles.avatar}>J</div>
            </div>
          </div>
        </header>

        <div className={financeStyles.financesContent}>
          <section className={financeStyles.summaryCards}>
            <div className={financeStyles.summaryHeader}>
              <h2>Financial Summary</h2>
              <button 
                className={financeStyles.toggleCardsButton}
                onClick={() => setShowCards(!showCards)}
              >
                {showCards ? <FaChevronUp /> : <FaChevronDown />}
                {showCards ? 'Hide Cards' : 'Show Cards'}
              </button>
            </div>
            
            {showCards && (
              <div className={financeStyles.cardsContainer}>
                <div className={financeStyles.summaryCard}>
                  <div className={financeStyles.cardIcon}>
                    <FaMoneyBillWave />
                  </div>
                  <div className={financeStyles.cardContent}>
                    <h3>Total Revenue</h3>
                    <div className={financeStyles.cardValue}>${calculateTotalRevenue()}</div>
                    <div className={financeStyles.cardSubtext}>Lifetime earnings</div>
                  </div>
                </div>
                
                <div className={financeStyles.summaryCard}>
                  <div className={financeStyles.cardIcon}>
                    <FaCCard />
                  </div>
                  <div className={financeStyles.cardContent}>
                    <h3>Current Balance</h3>
                    <div className={financeStyles.cardValue}>${calculateBalance()}</div>
                    <div className={financeStyles.cardSubtext}>Available for payout</div>
                  </div>
                </div>
                
                <div className={financeStyles.summaryCard}>
                  <div className={financeStyles.cardIcon}>
                    <FaReceipt />
                  </div>
                  <div className={financeStyles.cardContent}>
                    <h3>Pending Revenue</h3>
                    <div className={financeStyles.cardValue}>${calculateTotalPendingRevenue()}</div>
                    <div className={financeStyles.cardSubtext}>Processing payments</div>
                  </div>
                </div>
                
                <div className={financeStyles.summaryCard}>
                  <div className={financeStyles.cardIcon}>
                    <FaCreditCard />
                  </div>
                  <div className={financeStyles.cardContent}>
                    <h3>Total Paid Out</h3>
                    <div className={financeStyles.cardValue}>${calculateTotalPaidOut()}</div>
                    <div className={financeStyles.cardSubtext}>Transferred to bank</div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className={financeStyles.transactionsSection}>
            <div className={financeStyles.transactionsHeader}>
              <h2>Transaction History</h2>
              <div className={financeStyles.filtersContainer}>
                <div className={financeStyles.filterItem}>
                  <FaFilter />
                  <select 
                    value={filterTimeframe} 
                    onChange={(e) => setFilterTimeframe(e.target.value)}
                    className={financeStyles.filterSelect}
                  >
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="last3Months">Last 3 Months</option>
                    <option value="allTime">All Time</option>
                  </select>
                </div>
                <div className={financeStyles.filterItem}>
                  <FaFilter />
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className={financeStyles.filterSelect}
                  >
                    <option value="all">All Transactions</option>
                    <option value="booking">Bookings</option>
                    <option value="payout">Payouts</option>
                    <option value="refund">Refunds</option>
                    <option value="fee">Fees</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={financeStyles.transactionsTable}>
              <div className={financeStyles.tableHeader}>
                <div className={financeStyles.dateColumn}>Date</div>
                <div className={financeStyles.descriptionColumn}>Description</div>
                <div className={financeStyles.typeColumn}>Type</div>
                <div className={financeStyles.statusColumn}>Status</div>
                <div className={financeStyles.amountColumn}>Amount</div>
              </div>

              <div className={financeStyles.tableBody}>
                {getFilteredTransactions().length > 0 ? (
                  getFilteredTransactions().map(transaction => (
                    <div key={transaction.id} className={financeStyles.tableRow}>
                      <div className={financeStyles.dateColumn}>{formatDate(transaction.date)}</div>
                      <div className={financeStyles.descriptionColumn}>
                        {transaction.description}
                        {transaction.bookingId && (
                          <span className={financeStyles.bookingId}>
                            Booking #{transaction.bookingId}
                          </span>
                        )}
                      </div>
                      <div className={financeStyles.typeColumn}>
                        <span className={`${financeStyles.typeBadge} ${getTransactionTypeClass(transaction.type)}`}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </div>
                      <div className={financeStyles.statusColumn}>
                        <span className={`${financeStyles.statusBadge} ${getStatusClass(transaction.status)}`}>
                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                        </span>
                      </div>
                      <div className={`${financeStyles.amountColumn} ${transaction.amount < 0 ? financeStyles.negativeAmount : financeStyles.positiveAmount}`}>
                        {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={financeStyles.noTransactions}>
                    No transactions found matching your filters.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={financeStyles.payoutSection}>
            <div className={financeStyles.payoutCard}>
              <div className={financeStyles.payoutInfo}>
                <h2>Payout Settings</h2>
                <div className={financeStyles.payoutDetails}>
                  <div className={financeStyles.payoutMethod}>
                    <h3>Current Payout Method</h3>
                    <div className={financeStyles.bankInfo}>
                      <div className={financeStyles.bankLogo}>
                        <FaCCard />
                      </div>
                      <div className={financeStyles.bankDetails}>
                        <div className={financeStyles.bankName}>Chase Bank</div>
                        <div className={financeStyles.accountNumber}>Account ending in ****6789</div>
                      </div>
                    </div>
                  </div>
                  <div className={financeStyles.payoutSchedule}>
                    <h3>Payout Schedule</h3>
                    <div className={financeStyles.scheduleInfo}>
                      <div className={financeStyles.scheduleFrequency}>Monthly (1st of each month)</div>
                      <div className={financeStyles.minAmount}>Minimum payout amount: $100</div>
                      <div className={financeStyles.processingTime}>Processing time: 2-3 business days</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={financeStyles.payoutActions}>
                <button className={financeStyles.requestPayoutButton}>
                  Request Manual Payout
                </button>
                <button className={financeStyles.updateMethodButton}>
                  Update Payout Method
                </button>
                <button className={financeStyles.scheduleButton}>
                  Change Payout Schedule
                </button>
              </div>
            </div>
          </section>
        </div>
  
    </div>
  );
}