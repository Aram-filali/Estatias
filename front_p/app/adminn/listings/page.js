'use client';
import { useState } from 'react';
import styles from './Listings.module.css';
import { Home, AlertTriangle, Check, Filter } from 'lucide-react';

export default function Listings() {
  const [listings, setListings] = useState([
    {
      id: 1,
      title: "Luxury Oceanfront Villa",
      location: "Malibu, CA",
      host: "Sarah Johnson",
      price: "$5,200/night",
      status: "active",
      created: "2025-04-05",
      type: "Villa",
      bedrooms: 5
    },
    {
      id: 2,
      title: "Downtown Modern Loft",
      location: "New York, NY",
      host: "Michael Chen",
      price: "$350/night",
      status: "active",
      created: "2025-04-07",
      type: "Apartment",
      bedrooms: 2
    },
    {
      id: 3,
      title: "Mountain Retreat Cabin",
      location: "Aspen, CO",
      host: "Lisa Rodriguez",
      price: "$780/night",
      status: "active",
      created: "2025-04-08",
      type: "Cabin",
      bedrooms: 3
    },
    {
      id: 4,
      title: "Historic Downtown Apartment",
      location: "Boston, MA",
      host: "John Smith",
      price: "$290/night",
      status: "suspended",
      created: "2025-04-02",
      type: "Apartment",
      bedrooms: 1
    }
  ]);

  const [filters, setFilters] = useState({
    status: "all",
    type: "all"
  });

  const [showFilters, setShowFilters] = useState(false);

  const filteredListings = listings.filter(listing => {
    return (filters.status === "all" || listing.status === filters.status) &&
           (filters.type === "all" || listing.type === filters.type);
  });

  const handleSuspend = (id) => {
    setListings(listings.map(listing =>
      listing.id === id ? { ...listing, status: "suspended" } : listing
    ));
  };

  const handleActivate = (id) => {
    setListings(listings.map(listing =>
      listing.id === id ? { ...listing, status: "active" } : listing
    ));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Property Listings</h1>
        <button onClick={() => setShowFilters(!showFilters)} className={styles.filterButton}>
          <Filter className={styles.icon} />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className={styles.filterPanel}>
          <div className={styles.filterGrid}>
            <div>
              <label className={styles.label}>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className={styles.select}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="flagged">Flagged</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className={styles.label}>Property Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className={styles.select}
              >
                <option value="all">All Types</option>
                <option value="Apartment">Apartment</option>
                <option value="House">House</option>
                <option value="Villa">Villa</option>
                <option value="Cabin">Cabin</option>
              </select>
            </div>
            <div className={styles.applyWrapper}>
              <button className={styles.applyButton}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {filteredListings.map((listing) => (
          <div key={listing.id} className={styles.card}>
            <div className={styles.status}>
              {listing.status === 'flagged' && <span className={`${styles.badge} ${styles.flagged}`}>Flagged</span>}
              {listing.status === 'suspended' && <span className={`${styles.badge} ${styles.suspended}`}>Suspended</span>}
            </div>
            <div className={styles.cardContent}>
              <div className={styles.cardTop}>
                <div>
                  <h3 className={styles.cardTitle}>{listing.title}</h3>
                  <p className={styles.cardLocation}>{listing.location}</p>
                </div>
                <p className={styles.cardPrice}>{listing.price}</p>
              </div>

              <div className={styles.hostInfo}>
                <img
                  className={styles.avatar}
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(listing.host)}&background=random`}
                  alt={listing.host}
                />
                <div>
                  <p className={styles.hostName}>{listing.host}</p>
                  <p className={styles.created}>Added on {listing.created}</p>
                </div>
              </div>

              <div className={styles.tags}>
                <span className={styles.tag}><Home className={styles.tagIcon} /> {listing.type}</span>
                <span className={styles.tag}>{listing.bedrooms} BR</span>
              </div>

              <div className={styles.actions}>
                {listing.status !== 'suspended' ? (
                  <button onClick={() => handleSuspend(listing.id)} className={styles.suspendBtn}>
                    <AlertTriangle className={styles.iconSm} /> Suspend
                  </button>
                ) : (
                  <button onClick={() => handleActivate(listing.id)} className={styles.activateBtn}>
                    <Check className={styles.iconSm} /> Activate
                  </button>
                )}
                <button className={styles.viewBtn}>View Details</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
