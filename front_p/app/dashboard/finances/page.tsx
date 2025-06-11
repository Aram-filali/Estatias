// app/dashboard/finances/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import axios from 'axios';
import { FaHome, FaChartLine, FaCreditCard, FaBell, FaCog, FaSignOutAlt, 
         FaDownload, FaFilter, FaCalendarAlt, FaMoneyBillWave, FaChevronDown, 
         FaChevronUp, FaCreditCard as FaCCard, FaReceipt } from 'react-icons/fa';
import styles from '../Dashboard.module.css';
import financeStyles from './Finances.module.css';

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

interface ApiResponse<T = any> {
  statusCode: number;
  message?: string;
  data?: T;
  error?: string;
}

interface Transaction {
  _id: string;
  hostId: string;
  bookingId: string;
  guestId: string;
  amount: number;
  plan: string;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  platformFeeAmount: number;
  hostAmount: number;
  stripeConnectAccountId: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    createdVia?: string;
    planType?: string;
    [key: string]: any;
  };
}

interface ConnectAccount {
  accountId: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  bankAccount?: {
    bankName: string;
    last4: string;
  };
  accountStatus: any;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function FinancesPage() {
  const router = useRouter();
  
  // State for authentication and host data
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [host, setHost] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  
  // State for financial data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [connectAccount, setConnectAccount] = useState<ConnectAccount | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [connectAccountLoading, setConnectAccountLoading] = useState(false);
  
  // UI state
  const [filterTimeframe, setFilterTimeframe] = useState<string>('thisMonth');
  const [filterType, setFilterType] = useState<string>('all');
  const [showCards, setShowCards] = useState(true);

  // Authentication and host data fetching
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          await fetchHostData(user.uid, token);
          await fetchFinancialData(user.uid, token);
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

  const fetchFinancialData = async (hostId: string, token: string) => {
    await Promise.all([
      fetchTransactions(hostId, token),
      fetchConnectAccount(hostId, token)
    ]);
  };

  // Updated fetchTransactions function
const fetchTransactions = async (hostId: string, token: string) => {
  setTransactionsLoading(true);
  try {
    console.log(`Fetching transactions for host: ${hostId}`);
    
    const response = await axios.get<ApiResponse<{
      transactions: Transaction[];
      pagination: any;
      summary: any;
    }>>(`${API_BASE_URL}/connect/transactions/${hostId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000, // 10 second timeout
    });
    
    console.log('Transactions API response:', response.data);
    
    if (response.data && response.data.statusCode === 200) {
      const transactionData = response.data.data;
      if (transactionData && Array.isArray(transactionData.transactions)) {
        setTransactions(transactionData.transactions);
        console.log(`Successfully loaded ${transactionData.transactions.length} transactions`);
      } else {
        console.warn('Unexpected transaction data structure:', transactionData);
        setTransactions([]);
      }
    } else {
      const errorMessage = response.data?.message || 'Unknown error occurred';
      console.error("Failed to fetch transactions:", errorMessage);
      setError(`Failed to load transaction data: ${errorMessage}`);
      setTransactions([]);
    }
  } catch (err: any) {
    console.error("Error fetching transactions:", err);
    let errorMessage = 'Failed to load transaction data';
    
    if (err.response) {
      // Server responded with error status
      const serverMessage = err.response.data?.message || err.response.statusText;
      errorMessage = `Server error: ${serverMessage}`;
      console.error('Server error response:', err.response.data);
    } else if (err.request) {
      // Request was made but no response received
      errorMessage = 'No response from server. Please check your connection.';
      console.error('No response received:', err.request);
    } else {
      // Something else happened
      errorMessage = err.message || 'Unknown error occurred';
      console.error('Request setup error:', err.message);
    }
    
    setError(errorMessage);
    setTransactions([]);
  } finally {
    setTransactionsLoading(false);
  }
};

  // Updated fetchConnectAccount function
const fetchConnectAccount = async (hostId: string, token: string) => {
  setConnectAccountLoading(true);
  try {
    console.log(`Fetching connect account for host: ${hostId}`);
    
    const response = await axios.get<ApiResponse<ConnectAccount>>(
      `${API_BASE_URL}/connect/account/${hostId}`, 
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000, // 10 second timeout
      }
    );
    
    console.log('Connect account API response:', response.data);
    
    if (response.data && response.data.statusCode === 200) {
      setConnectAccount(response.data.data || null);
      console.log('Successfully loaded connect account');
    } else if (response.data && response.data.statusCode === 404) {
      // Connect account not found is not an error - it might not be set up yet
      console.log('Connect account not found - user may need to set up payments');
      setConnectAccount(null);
    } else {
      const errorMessage = response.data?.message || 'Unknown error occurred';
      console.warn("Failed to fetch connect account:", errorMessage);
      setConnectAccount(null);
      // Don't set error for connect account as it might not exist yet
    }
  } catch (err: any) {
    console.error("Error fetching connect account:", err);
    setConnectAccount(null);
    
    // Only log the error, don't set it in UI since connect account might not exist
    if (err.response && err.response.status !== 404) {
      console.error('Connect account error response:', err.response.data);
    }
  } finally {
    setConnectAccountLoading(false);
  }
};

  const calculateTotalRevenue = (): number => {
    return transactions
      .filter(t => t.status === 'PAID')
      .reduce((sum, transaction) => sum + transaction.hostAmount, 0);
  };
  
  const calculateTotalPendingRevenue = (): number => {
    return transactions
      .filter(t => t.status === 'PENDING')
      .reduce((sum, transaction) => sum + transaction.hostAmount, 0);
  };
  
  const calculateTotalPaidOut = (): number => {
    // This would need to be tracked separately in your system
    // For now, we'll estimate based on completed transactions older than payout schedule
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return transactions
      .filter(t => t.status === 'PAID' && new Date(t.paidAt || t.createdAt) < oneMonthAgo)
      .reduce((sum, transaction) => sum + transaction.hostAmount, 0);
  };

  const calculateBalance = (): number => {
    const totalRevenue = calculateTotalRevenue();
    const totalPaidOut = calculateTotalPaidOut();
    return totalRevenue - totalPaidOut;
  };

  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getTransactionTypeClass = (status: string): string => {
    switch(status) {
      case 'PAID': return financeStyles.typeBooking;
      case 'PENDING': return financeStyles.typePending;
      case 'FAILED': return financeStyles.typeRefund;
      case 'REFUNDED': return financeStyles.typeRefund;
      default: return '';
    }
  };

  const getStatusClass = (status: string): string => {
    switch(status) {
      case 'PAID': return financeStyles.statusCompleted;
      case 'PENDING': return financeStyles.statusPending;
      case 'FAILED': return financeStyles.statusFailed;
      case 'REFUNDED': return financeStyles.statusFailed;
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
      filtered = filtered.filter(t => new Date(t.createdAt) >= firstDayOfMonth);
    } else if (filterTimeframe === 'lastMonth') {
      filtered = filtered.filter(t => new Date(t.createdAt) >= firstDayOfLastMonth && new Date(t.createdAt) < firstDayOfMonth);
    } else if (filterTimeframe === 'last3Months') {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      filtered = filtered.filter(t => new Date(t.createdAt) >= threeMonthsAgo);
    }
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.status.toLowerCase() === filterType.toLowerCase());
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const downloadReport = () => {
    alert("Downloading financial report...");
    // In a real application, this would generate and download a CSV or PDF
  };

  // Updated requestManualPayout function
const requestManualPayout = async () => {
  if (!authToken || !host) return;
  
  try {
    console.log(`Requesting manual payout for host: ${host.id}`);
    
    const response = await axios.post<ApiResponse>(
      `${API_BASE_URL}/connect/payout/${host.id}`, 
      {}, 
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 15000, // 15 second timeout for payout requests
      }
    );
    
    console.log('Manual payout API response:', response.data);
    
    if (response.data && response.data.statusCode === 200) {
      alert("Manual payout requested successfully!");
      // Refresh financial data to show updated balances
      await fetchFinancialData(host.id, authToken);
    } else {
      const errorMessage = response.data?.message || 'Unknown error occurred';
      alert("Failed to request payout: " + errorMessage);
    }
  } catch (err: any) {
    console.error("Error requesting payout:", err);
    
    let errorMessage = 'Failed to request manual payout';
    if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    alert(errorMessage + ". Please try again.");
  }
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

  // Updated error display component
  const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
    <div className={styles.errorState}>
      <h3>Something went wrong</h3>
      <p>{error}</p>
      {onRetry && (
        <button className={styles.primaryButton} onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );

  // Add retry functionality to the main component
  const retryLoadingData = async () => {
    if (!authToken || !host?.id) return;
    
    setError(null);
    setLoading(true);
    
    try {
      await fetchFinancialData(host.id, authToken);
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update the error state render
  if (error && !host) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={() => {
          setError(null);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div>
      <header className={styles.header}>
        <div className={styles.pageTitleContainer}>
          <h1 className={styles.pageTitle}>Financial Overview</h1>
        </div>
        <div className={styles.profileSection}>
          <div className={styles.profileInfo}>
            <span>{host.name}</span>
            <div className={styles.avatar}>{host.name?.charAt(0) || ''}</div>
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
                  <div className={financeStyles.cardValue}>${calculateTotalRevenue().toFixed(2)}</div>
                  <div className={financeStyles.cardSubtext}>Lifetime earnings</div>
                </div>
              </div>
              
              <div className={financeStyles.summaryCard}>
                <div className={financeStyles.cardIcon}>
                  <FaCCard />
                </div>
                <div className={financeStyles.cardContent}>
                  <h3>Current Balance</h3>
                  <div className={financeStyles.cardValue}>${calculateBalance().toFixed(2)}</div>
                  <div className={financeStyles.cardSubtext}>Available for payout</div>
                </div>
              </div>
              
              <div className={financeStyles.summaryCard}>
                <div className={financeStyles.cardIcon}>
                  <FaReceipt />
                </div>
                <div className={financeStyles.cardContent}>
                  <h3>Pending Revenue</h3>
                  <div className={financeStyles.cardValue}>${calculateTotalPendingRevenue().toFixed(2)}</div>
                  <div className={financeStyles.cardSubtext}>Processing payments</div>
                </div>
              </div>
              
              <div className={financeStyles.summaryCard}>
                <div className={financeStyles.cardIcon}>
                  <FaCreditCard />
                </div>
                <div className={financeStyles.cardContent}>
                  <h3>Total Paid Out</h3>
                  <div className={financeStyles.cardValue}>${calculateTotalPaidOut().toFixed(2)}</div>
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
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </div>

          <div className={financeStyles.transactionsTable}>
            <div className={financeStyles.tableHeader}>
              <div className={financeStyles.dateColumn}>Date</div>
              <div className={financeStyles.descriptionColumn}>Description</div>
              <div className={financeStyles.typeColumn}>Plan</div>
              <div className={financeStyles.statusColumn}>Status</div>
              <div className={financeStyles.amountColumn}>Host Amount</div>
            </div>

            <div className={financeStyles.tableBody}>
              {transactionsLoading ? (
                <div className={financeStyles.loadingTransactions}>
                  Loading transactions...
                </div>
              ) : getFilteredTransactions().length > 0 ? (
                getFilteredTransactions().map(transaction => (
                  <div key={transaction._id} className={financeStyles.tableRow}>
                    <div className={financeStyles.dateColumn}>
                      {formatDate(transaction.createdAt)}
                    </div>
                    <div className={financeStyles.descriptionColumn}>
                      Booking Payment - {transaction.plan}
                      <span className={financeStyles.bookingId}>
                        Booking #{transaction.bookingId}
                      </span>
                    </div>
                    <div className={financeStyles.typeColumn}>
                      <span className={`${financeStyles.typeBadge} ${getTransactionTypeClass(transaction.status)}`}>
                        {transaction.plan}
                      </span>
                    </div>
                    <div className={financeStyles.statusColumn}>
                      <span className={`${financeStyles.statusBadge} ${getStatusClass(transaction.status)}`}>
                        {transaction.status.charAt(0) + transaction.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <div className={`${financeStyles.amountColumn} ${financeStyles.positiveAmount}`}>
                      +${(transaction.hostAmount / 100).toFixed(2)} {transaction.currency.toUpperCase()}
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
                  {connectAccountLoading ? (
                    <div>Loading payout information...</div>
                  ) : connectAccount ? (
                    <div className={financeStyles.bankInfo}>
                      <div className={financeStyles.bankLogo}>
                        <FaCCard />
                      </div>
                      <div className={financeStyles.bankDetails}>
                        <div className={financeStyles.bankName}>
                          {connectAccount.bankAccount?.bankName || 'Bank Account'}
                        </div>
                        <div className={financeStyles.accountNumber}>
                          Account ending in ****{connectAccount.bankAccount?.last4 || 'XXXX'}
                        </div>
                        <div className={financeStyles.accountStatus}>
                          Status: {connectAccount.payoutsEnabled ? 'Active' : 'Setup Required'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={financeStyles.noBankInfo}>
                      No payout method configured. Please set up your Stripe Connect account.
                    </div>
                  )}
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
              <button 
                className={financeStyles.requestPayoutButton}
                onClick={requestManualPayout}
                disabled={!connectAccount?.payoutsEnabled}
              >
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