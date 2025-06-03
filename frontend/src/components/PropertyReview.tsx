import React from 'react';


const PropertyReview: React.FC = () => {
  return (
    <div className="property-review-container">
      <div className="review-header">
        <h2>Review</h2>
        <button className="login-button">
          <span className="star-icon">★</span>
          Login To Write Your Review
        </button>
      </div>
      
      <div className="rating-section">
        <div className="rating-number">5</div>
        <div className="star-rating">
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
        </div>
        <div className="review-count">1 review</div>
      </div>
      
      <div className="review-item">
        <div className="reviewer-info">
          <div className="reviewer-icon">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAKElEQVQ4jWNgYGD4Twzu6FhFFGYYNXDUwGFpIAk2E4dHDRw1cDgaCAASFOffhEIO3gAAAABJRU5ErkJggg==" 
              alt="Realar" />
          </div>
          <div className="reviewer-details">
            <div className="reviewer-name">Realar</div>
            <div className="review-date">7 May, 2024</div>
          </div>
        </div>
        <div className="review-content">
          Rapidiously myocardinate cross-platform intellectual capital model. Appropriately create interactive infrastructures.
        </div>
        <div className="review-stars">
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
        </div>
      </div>
    </div>
  );
};

export default PropertyReview;
