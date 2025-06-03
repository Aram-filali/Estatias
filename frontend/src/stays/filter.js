"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import FilterPopup from './filterPopup';

const PropertyFilter = ({ onFilterChange }) => {
  const [activeFilter, setActiveFilter] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});
  
  const filters = [
    { id: 'hotels', name: 'Hotels', image: '/hotel.png' },
    { id: 'apartments', name: 'Apartments', image: '/building.png' },
    { id: 'villas', name: 'Villas', image: '/villa.png' },
    { id: 'rooms', name: 'Rooms', image: '/hotel-bed.png' },
    { id: 'cabins', name: 'Cabins', image: '/hut.png' },
  ];

  const handleFilterClick = (filterId) => {
    const newActiveFilter = activeFilter === filterId ? null : filterId;
    setActiveFilter(newActiveFilter);
    
    if (onFilterChange) {
      onFilterChange(newActiveFilter);
    }
  };

  const handlePopupToggle = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  const handlePopupClose = () => {
    setIsPopupOpen(false);
  };

  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
    
    if (onFilterChange) {
      onFilterChange({ type: activeFilter, ...filters });
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    
    if (appliedFilters.priceRange && 
        (appliedFilters.priceRange[0] > 50 || appliedFilters.priceRange[1] < 1200)) {
      count++;
    }
    
    if (appliedFilters.placeType && appliedFilters.placeType !== 'any') {
      count++;
    }
    
    if (appliedFilters.amenities && appliedFilters.amenities.length > 0) {
      count += appliedFilters.amenities.length;
    }
    
    if (appliedFilters.locations && appliedFilters.locations.length > 0) {
      count += appliedFilters.locations.length;
    }
    
    if (appliedFilters.safety && appliedFilters.safety.length > 0) {
      count += appliedFilters.safety.length;
    }
    
    return count;
  };

  return (
    <div className="filters-container">
      <div className="filters-wrapper">
        <div className="filters-list">
          {filters.map((filter) => (
            <div 
              key={filter.id}
              className={`filter-item ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => handleFilterClick(filter.id)}
            >
              <div className={`icon-container ${activeFilter === filter.id ? 'active-icon' : ''}`}>
                <img
                  src={filter.image}
                  alt={filter.name}
                  className="filter-icon"
                />
                {activeFilter === filter.id && (
                  <motion.div
                    className="icon-underline"
                    layoutId="underline"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
              <span className={`filter-name ${activeFilter === filter.id ? 'active-name' : ''}`}>
                {filter.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="filters-button-container">
        <button className="filters-button" onClick={handlePopupToggle}>
          <span className="filter-button-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
          </span>
          Filters
          {getActiveFiltersCount() > 0 && (
            <span className="filter-badge">{getActiveFiltersCount()}</span>
          )}
        </button>
      </div>

      {/* Filter Popup Component */}
      <FilterPopup 
        isOpen={isPopupOpen}
        onClose={handlePopupClose}
        onApplyFilters={handleApplyFilters}
      />

      <style jsx>{`
        .filters-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 0;
          margin: 20px 0;
          border-bottom: 1px solid rgba(113, 128, 150, 0.2);
          position: relative;
        }

        .filters-wrapper {
          flex: 1;
          display: flex;
          justify-content: center;
          overflow-x: auto;
        }

        .filters-list {
          display: flex;
          gap: 24px;
          padding-bottom: 8px;
          scrollbar-width: thin;
        }

        .filters-list::-webkit-scrollbar {
          height: 4px;
        }

        .filters-list::-webkit-scrollbar-track {
          background: rgba(105, 112, 122, 0.1);
          border-radius: 4px;
        }

        .filters-list::-webkit-scrollbar-thumb {
          background: rgba(70, 76, 86, 0.3);
          border-radius: 4px;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .filter-item:hover {
          transform: translateY(-2px);
        }

        .icon-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          margin-left: 50px; 
          background: rgba(56, 53, 88, 0.15);
          margin-bottom: 8px;
          transition: all 0.3s ease;
          justify-content: center;
        }

        .icon-container.active-icon {
          background: rgba(56, 53, 88, 0.15);
          box-shadow: 0 4px 12px rgba(81, 84, 90, 0.3);
        }

        .filter-icon {
          width: 28px;
          height: 28px;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .active-icon .filter-icon {
          transform: scale(1.1);
        }

        .icon-underline {
          position: absolute;
          bottom: -4px;
          width: 30px;
          height: 3px;
          background-color: #2d3748;
          border-radius: 2px;
        }

        .filter-name {
          font-size: 0.9rem;
          color: #718096;
          font-weight: 500;
          transition: color 0.3s ease;
          text-align: center;
          margin-left: 50px; 
        }

        .active-name {
          color: #2d3748;
          font-weight: 600;
        }

        .filters-button-container {
          position: relative;
        }

        .filters-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgb(20, 26, 36);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.95rem;
          white-space: nowrap;
          position: relative;
        }

        .filters-button:hover {
          background: rgb(16, 27, 45);
          transform: scale(1.05);
        }

        .filter-button-icon {
          display: flex;
          align-items: center;
        }

        .filter-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background-color:rgb(24, 23, 48);
          color: white;
          font-size: 0.75rem;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .filters-container {
            flex-direction: column;
            align-items: center;
            gap: 15px;
          }

          .filters-wrapper {
            width: 100%;
            justify-content: center;
          }

          .filters-list {
            justify-content: center;
            flex-wrap: nowrap;
          }

          .filters-button-container {
            align-self: center;
            margin-left: auto;
          }
        }

        @media (max-width: 576px) {
          .filter-item {
            width: 60px;
          }

          .icon-container {
            width: 45px;
            height: 45px;
          }

          .filter-name {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PropertyFilter;