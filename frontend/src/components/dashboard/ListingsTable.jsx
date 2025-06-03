// app/dashboard/components/ListingsTable.jsx 
import { Edit, Trash, Eye } from 'lucide-react'; 
import styles from './ListingsTable.module.css';  

export default function ListingsTable({ listings, onEdit, onView, onDelete }) {
  const formatPrice = (price) => {
    if (!price) return '$0/night';
    return `$${price}/night`;
  };
    
  return (
    <div className={styles.tableContainer}>
      <table className={styles.listingsTable}>
        <thead>
          <tr>
            <th>Property</th>
            <th>Location</th>
            <th>Type</th>
            <th>Price</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {listings && listings.length > 0 ? (
            listings.map((listing) => (
              <tr key={listing._id || listing.id || `listing-${listing.title}-${Math.random().toString(36).substr(2, 9)}`}>
                <td className={styles.titleCell}>
                  <div className={styles.listingTitle}>{listing.title}</div>
                  <div className={styles.listingSubtitle}>
                    {listing.maxGuest || 0} guests • {listing.bedrooms || 0} BR
                  </div>
                </td>
                <td>
                  {listing.city || 'N/A'}{listing.city && listing.state ? ', ' : ''}{listing.state || ''}
                </td>
                <td>{listing.type || 'N/A'}</td>
                <td>{formatPrice(listing.price)}</td>
                <td>
                  <span 
                    className={`${styles.statusBadge} ${listing.status ? styles[listing.status] : styles.unknown}`}
                  >
                    {listing.status
                      ? listing.status.charAt(0).toUpperCase() + listing.status.slice(1)
                      : 'working on it'}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className={styles.noListings}>
                No listings found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}