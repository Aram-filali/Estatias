'use client';
import { useState, useEffect, useCallback } from 'react';
import { Mail, Phone, ExternalLink, FileText, Download, Eye } from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import styles from './HostsPage.module.css';
import { useHostDocuments } from '@/src/hooks/useHostDocuments'; // Adjust path as needed
import { DocumentsList } from 'components/DocumentsList';


export default function Hosts() {
  const [hosts, setHosts] = useState([]);
  const [selectedHost, setSelectedHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const {
    documentUrls,
    isLoading: documentsLoading,
    error: documentsError,
    fetchDocuments,
    clearDocuments,
    hasDocuments,
    getDocumentDisplayName,
    handleDocumentAction
  } = useHostDocuments(authToken);

  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Authentication effect
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          setAuthToken(token);
          console.log('Admin authenticated:', user.uid);
        } catch (err) {
          console.error("Error getting authentication token:", err);
          setError("Authentication error. Please try logging in again.");
        }
      } else {
        setError("You must be logged in to view the admin dashboard.");
        setLoading(false);
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch hosts when auth token is available
  useEffect(() => {
    if (authToken) {
      fetchHosts();
    }
  }, [authToken]);

  // Fetch documents when a host is selected
  useEffect(() => {
    if (selectedHost && authToken) {
      fetchDocuments(selectedHost.originalData.firebaseUid);
    } else {
      clearDocuments(); // Clear documents when no host is selected
    }
  }, [selectedHost, authToken, fetchDocuments, clearDocuments]);

  const fetchHosts = async () => {
    if (!authToken) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/hosts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the backend data to match the frontend structure
      const transformedHosts = data.map(host => ({
        id: host._id || host.id,
        name: host.isAgency ? host.businessName : `${host.firstName || ''} ${host.lastName || ''}`.trim(),
        email: host.email,
        phone: host.phoneNumber,
        joinDate: new Date(host.createdAt || Date.now()).toISOString().split('T')[0],
        activeListings: host.propertiesCount || 0,
        totalWebsites: host.websiteUrl ? 1 : 0,
        status: host.status?.toLowerCase() || 'pending',
        verificationStatus: host.emailVerified ? 'verified' : 'pending',
        lastActive: new Date(host.updatedAt || Date.now()).toISOString().split('T')[0],
        websiteUrl: host.websiteUrl,
        // Keep original data for detailed view
        originalData: host
      }));

      setHosts(transformedHosts);
    } catch (err) {
      console.error('Error fetching hosts:', err);
      setError('Failed to load hosts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

 

  const updateHostStatus = async (hostId, newStatus) => {
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/hosts/${hostId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state
      setHosts(hosts.map(host => 
        host.id === hostId ? {...host, status: newStatus} : host
      ));
      
      if (selectedHost && selectedHost.id === hostId) {
        setSelectedHost({...selectedHost, status: newStatus});
      }
    } catch (err) {
      console.error('Error updating host status:', err);
      setError('Failed to update host status. Please try again.');
    }
  };

  const handleStatusChange = (id, newStatus) => {
    updateHostStatus(id, newStatus);
  };

  // Helper function to get status color class
  const getStatusColorClass = (status) => {
    switch (status) {
      case 'approved':
        return styles.statusApproved;
      case 'suspended':
        return styles.statusSuspended;
      case 'rejected':
        return styles.statusRejected;
      case 'pending':
      default:
        return styles.statusPending;
    }
  };

  // Helper function to get available actions based on current status
  const getAvailableActions = (currentStatus) => {
    switch (currentStatus) {
      case 'pending':
        return [
          { status: 'approved', label: 'Approve Host', className: styles.approveButton },
          { status: 'rejected', label: 'Reject Host', className: styles.rejectButton }
        ];
      case 'approved':
        return [
          { status: 'suspended', label: 'Suspend Host', className: styles.suspendButton }
        ];
      case 'suspended':
        return [
          { status: 'approved', label: 'Reactivate Host', className: styles.approveButton }
        ];
      case 'rejected':
        return [
          { status: 'approved', label: 'Approve Host', className: styles.approveButton }
        ];
      default:
        return [];
    }
  };

  // Helper function to format website URL for display and linking
  const formatWebsiteUrl = (url) => {
    if (!url) return null;
    
    // If URL doesn't start with http:// or https://, add https://
    const formattedUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    
    return formattedUrl;
  };
/*
  // Helper function to get document type display name
  const getDocumentDisplayName = (docType) => {
    switch (docType) {
      case 'kbisOrId':
        return selectedHost?.originalData?.isAgency ? 'KBIS Document' : 'ID Document';
      case 'proxy':
        return 'Proxy Document';
      case 'repId':
        return 'Representative ID';
      default:
        return docType;
    }
  };

  // Helper function to handle document viewing/downloading
  const handleDocumentAction = (url, action = 'view') => {
    if (!url) return;
    
    if (action === 'view') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (action === 'download') {
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = true;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };*/
/*
  // Component to render document items
  const DocumentItem = ({ docType, url }) => {
    if (!url) return null;

    return (
      <div className={styles.documentItem}>
        <div className={styles.documentInfo}>
          <FileText className={styles.documentIcon} />
          <span className={styles.documentName}>
            {getDocumentDisplayName(docType)}
          </span>
        </div>
        <div className={styles.documentActions}>
          <button
            onClick={() => handleDocumentAction(url, 'view')}
            className={styles.documentActionButton}
            title="View Document"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleDocumentAction(url, 'download')}
            className={styles.documentActionButton}
            title="Download Document"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
    );
  };*/

  // Filter hosts based on search and status
  const filteredHosts = hosts.filter(host => {
    const matchesSearch = host.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         host.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || host.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <p>Loading hosts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p>{error}</p>
          <button onClick={fetchHosts} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Host Management</h1>
        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search hosts..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Hosts</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.tableContainer}>
          <div className={styles.card}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th scope="col" className={styles.tableHeader}>
                    Host
                  </th>
                  <th scope="col" className={styles.tableHeader}>
                    Status
                  </th>
                  <th scope="col" className={styles.tableHeader}>
                    Properties
                  </th>
                  <th scope="col" className={styles.tableHeader}>
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className={styles.tableBody}>
                {filteredHosts.map((host) => (
                  <tr 
                    key={host.id} 
                    onClick={() => setSelectedHost(host)}
                    className={`${styles.tableRow} ${selectedHost?.id === host.id ? styles.selectedRow : ''}`}
                  >
                    <td className={styles.tableCell}>
                      <div className={styles.cellContent}>
                        <div className={styles.avatar}>
                          <img className={styles.roundedAvatar} src="/api/placeholder/40/40" alt="" />
                        </div>
                        <div className={styles.userInfo}>
                          <div className={styles.userName}>{host.name}</div>
                          <div className={styles.userEmail}>{host.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.status} ${getStatusColorClass(host.status)}`}>
                        {host.status.charAt(0).toUpperCase() + host.status.slice(1)}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      {host.activeListings}
                    </td>
                    <td className={styles.tableCell}>
                      {host.lastActive}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.detailContainer}>
          {selectedHost ? (
            <div className={styles.card}>
              <div className={styles.profileHeader}>
                <h3 className={styles.profileTitle}>
                  Host Profile
                </h3>
                <div className={styles.actionButtons}>
                  {getAvailableActions(selectedHost.status).map((action) => (
                    <button
                      key={action.status}
                      onClick={() => handleStatusChange(selectedHost.id, action.status)}
                      className={action.className}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.detailList}>
                <dl>
                  <div className={`${styles.detailItem} ${styles.detailItemGray}`}>
                    <dt className={styles.detailLabel}>Full name</dt>
                    <dd className={styles.detailValue}>{selectedHost.name}</dd>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailItemWhite}`}>
                    <dt className={styles.detailLabel}>Email</dt>
                    <dd className={`${styles.detailValue} ${styles.detailValueFlex}`}>
                      {selectedHost.email}
                      <a href={`mailto:${selectedHost.email}`} className={styles.link}>
                        <Mail className={styles.externalLinkIcon} />
                      </a>
                    </dd>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailItemGray}`}>
                    <dt className={styles.detailLabel}>Phone number</dt>
                    <dd className={`${styles.detailValue} ${styles.detailValueFlex}`}>
                      {selectedHost.phone}
                      <a href={`tel:${selectedHost.phone}`} className={styles.link}>
                        <Phone className={styles.externalLinkIcon} />
                      </a>
                    </dd>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailItemWhite}`}>
                    <dt className={styles.detailLabel}>Join date</dt>
                    <dd className={styles.detailValue}>{selectedHost.joinDate}</dd>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailItemGray}`}>
                    <dt className={styles.detailLabel}>Type</dt>
                    <dd className={styles.detailValue}>
                      {selectedHost.originalData?.isAgency ? 'Agency' : 'Individual'}
                    </dd>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailItemWhite}`}>
                    <dt className={styles.detailLabel}>Domain</dt>
                    <dd className={styles.detailValue}>
                      {selectedHost.originalData?.domainName || 'Not assigned'}
                    </dd>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailItemGray}`}>
                    <dt className={styles.detailLabel}>Website URL</dt>
                    <dd className={styles.detailValue}>
                      {selectedHost.websiteUrl ? (
                        <div className={styles.detailValueFlex}>
                          <span>{selectedHost.websiteUrl}</span>
                          <a 
                            href={formatWebsiteUrl(selectedHost.websiteUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.externalLink}
                          >
                            <ExternalLink className={styles.externalLinkIcon} />
                            Visit
                          </a>
                        </div>
                      ) : (
                        "No website URL"
                      )}
                    </dd>
                  </div>
                  
                  {/* Documents Section - Replacing Status */}
                  <div className={`${styles.detailItem} ${styles.detailItemWhite} ${styles.documentsSection}`}>
                    <dt className={styles.detailLabel}>Documents</dt>
                    <dd className={styles.detailValue}>
                      <DocumentsList
                        documentUrls={documentUrls}
                        isAgency={selectedHost.originalData?.isAgency || false}
                        getDocumentDisplayName={getDocumentDisplayName}
                        handleDocumentAction={handleDocumentAction}
                        styles={styles}
                        isLoading={documentsLoading}
                        error={documentsError}
                        onRetry={() => fetchDocuments(selectedHost.originalData.firebaseUid)}
                      />
                    </dd>
                  </div>
                </dl>
              </div>
              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.viewButton}
                  disabled={selectedHost.status !== 'approved'}
                >
                  View All Listings
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div>
                <p className={styles.emptyText}>Select a host to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}