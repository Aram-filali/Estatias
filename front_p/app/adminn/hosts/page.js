'use client';
import { useState } from 'react';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import styles from './HostsPage.module.css';

export default function Hosts() {
  const [hosts, setHosts] = useState([
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@seasideproperties.com",
      phone: "+1 (555) 123-4567",
      joinDate: "2025-01-15",
      activeListings: 12,
      totalWebsites: 1,
      status: "active",
      verificationStatus: "verified",
      lastActive: "2025-04-10"
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "mchen@urbanliving.com",
      phone: "+1 (555) 987-6543",
      joinDate: "2025-02-03",
      activeListings: 8,
      totalWebsites: 1,
      status: "active",
      verificationStatus: "verified",
      lastActive: "2025-04-09"
    },
    {
      id: 3,
      name: "Lisa Rodriguez",
      email: "lisa@sunsetvillas.com",
      phone: "+1 (555) 234-5678",
      joinDate: "2025-01-22",
      activeListings: 5,
      totalWebsites: 1,
      status: "active",
      verificationStatus: "verified",
      lastActive: "2025-04-08"
    },
    {
      id: 4,
      name: "John Smith",
      email: "john@smithproperties.com",
      phone: "+1 (555) 345-6789",
      joinDate: "2025-03-10",
      activeListings: 3,
      totalWebsites: 1,
      status: "suspended",
      verificationStatus: "verified",
      lastActive: "2025-04-02"
    },
    {
      id: 5,
      name: "Emily Davis",
      email: "emily@cityscaperealty.com",
      phone: "+1 (555) 456-7890",
      joinDate: "2025-02-28",
      activeListings: 7,
      totalWebsites: 1,
      status: "active",
      verificationStatus: "pending",
      lastActive: "2025-04-07"
    }
  ]);

  const [selectedHost, setSelectedHost] = useState(null);

  const handleStatusChange = (id, newStatus) => {
    setHosts(hosts.map(host => 
      host.id === id ? {...host, status: newStatus} : host
    ));
    if (selectedHost && selectedHost.id === id) {
      setSelectedHost({...selectedHost, status: newStatus});
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Host Management</h1>
        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Search hosts..."
            className={styles.searchInput}
          />
          <select
            className={styles.select}
            defaultValue="all"
          >
            <option value="all">All Hosts</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending Verification</option>
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
                    Listings
                  </th>
                  <th scope="col" className={styles.tableHeader}>
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className={styles.tableBody}>
                {hosts.map((host) => (
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
                      <span className={`${styles.status} ${
                        host.status === 'active' ? styles.statusActive : 
                        host.status === 'suspended' ? styles.statusSuspended : 
                        styles.statusPending
                      }`}>
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
                {selectedHost.status === 'active' ? (
                  <button
                    onClick={() => handleStatusChange(selectedHost.id, 'suspended')}
                    className={styles.suspendButton}
                  >
                    Suspend Host
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(selectedHost.id, 'active')}
                    className={styles.activateButton}
                  >
                    Activate Host
                  </button>
                )}
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
                    <dt className={styles.detailLabel}>Websites</dt>
                    <dd className={styles.detailValue}>
                      {selectedHost.totalWebsites > 0 ? (
                        <div className={styles.detailValueFlex}>
                          <span>{selectedHost.totalWebsites} website(s)</span>
                          <button className={styles.externalLink}>
                            <ExternalLink className={styles.externalLinkIcon} />
                            View
                          </button>
                        </div>
                      ) : (
                        "No websites"
                      )}
                    </dd>
                  </div>
                  <div className={`${styles.detailItem} ${styles.detailItemWhite}`}>
                    <dt className={styles.detailLabel}>Verification</dt>
                    <dd className={styles.detailValue}>
                      <span className={`${styles.status} ${
                        selectedHost.verificationStatus === 'verified' ? styles.statusActive : 
                        styles.statusPending
                      }`}>
                        {selectedHost.verificationStatus.charAt(0).toUpperCase() + selectedHost.verificationStatus.slice(1)}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
              <div className={styles.footer}>
                <button
                  type="button"
                  className={styles.viewButton}
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