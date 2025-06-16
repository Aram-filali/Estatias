"use client";
import React, { useState, useEffect } from 'react';
import { Star, Edit2, Trash2, MessageSquare, X } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase'; 
import styles from './PropertyReview.module.css';

interface Review {
  id: string;
  userEmail: string;
  hostUid: string;
  comment: string;
  rating: number;
  date: string;
}

interface ReviewStats {
  reviews: Review[];
  totalCount: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
}

interface PropertyReviewProps {
  propertyId: string;
}

interface AuthUser {
  email: string;
  role: string;
  uid: string;
}

const PropertyReview: React.FC<PropertyReviewProps> = ({ propertyId }) => {
  // Authentication state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Review state
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    reviews: [],
    totalCount: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [userReviewLoading, setUserReviewLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    comment: '',
    rating: 5
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  const hostUid = process.env.NEXT_PUBLIC_HOST_ID;

 
    console.log("Using hostId:", hostUid);

    if (!hostUid) {
      console.error("Host ID not found in environment variables");
      setLoading(false);
      return;
    }

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get fresh token and custom claims
          const token = await firebaseUser.getIdToken(true);
          const tokenResult = await firebaseUser.getIdTokenResult();
          
          // Get role from custom claims (set by your backend) with proper type handling
          const roleFromClaims = tokenResult.claims.role as string | undefined;
          
          const authUser: AuthUser = {
            email: firebaseUser.email || '',
            role: roleFromClaims || 'user',
            uid: firebaseUser.uid
          };
          
          setUser(authUser);
          setAuthToken(token);
          
          console.log('User authenticated:', {
            email: firebaseUser.email,
            role: roleFromClaims,
            uid: firebaseUser.uid
          });
        } else {
          // User is signed out - reset all user-related state
          setUser(null);
          setAuthToken(null);
          setUserReview(null);
          setShowReviewForm(false);
          setIsEditing(false);
          setFormData({ comment: '', rating: 5 });
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setAuthToken(null);
        setUserReview(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Reviews effect - Load general reviews when component mounts or page changes
  useEffect(() => {
    if (propertyId && !authLoading) {
      fetchReviews();
    }
  }, [propertyId, page, authLoading]);

  // Separate effect for user review - only when user is authenticated
  useEffect(() => {
    if (propertyId && user?.role === 'user' && authToken && !authLoading) {
      fetchUserReview();
    } else if (!user || user.role !== 'user') {
      // Clear user review if user is not authenticated or not a regular user
      setUserReview(null);
      setUserReviewLoading(false);
    }
  }, [propertyId, user, authToken, authLoading]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${baseUrl}/properties/${propertyId}/reviews?page=${page}&limit=10`);
      const data = await response.json();
      
      if (data.statusCode === 200) {
        setReviewStats(data.data);
      } else {
        setError(data.error || 'Failed to load reviews');
      }
    } catch (err) {
      setError('Failed to load reviews');
      console.error('Error fetching reviews:', err);
    }
  };

  const fetchUserReview = async () => {
    if (!authToken || !user) return;
    
    setUserReviewLoading(true);
    try {
      const response = await fetch(`${baseUrl}/properties/${propertyId}/user-review`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await response.json();
      
      console.log('User review fetch response:', data); // Debug log
      
      if (data.statusCode === 200) {
        if (data.data) {
          // User has an existing review
          setUserReview(data.data);
          setFormData({
            comment: data.data.comment,
            rating: data.data.rating
          });
        } else {
          // No existing review found
          setUserReview(null);
          setFormData({ comment: '', rating: 5 });
        }
      } else {
        // Handle error response
        console.warn('Failed to fetch user review:', data.error);
        setUserReview(null);
        setFormData({ comment: '', rating: 5 });
      }
    } catch (err) {
      console.error('Error fetching user review:', err);
      setUserReview(null);
      setFormData({ comment: '', rating: 5 });
    } finally {
      setUserReviewLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      setError('You must be logged in to submit a review');
      return;
    }

    // Additional validation
    if (!formData.comment.trim()) {
      setError('Please enter a comment');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `${baseUrl}/properties/reviews/${userReview?.id}` : `${baseUrl}/properties/reviews`;
      const method = isEditing ? 'PATCH' : 'POST';
      
      const body = isEditing 
        ? formData 
        : { ...formData, propertyId, hostUid };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (data.statusCode === (isEditing ? 200 : 201)) {
        setUserReview(data.data);
        setShowReviewForm(false);
        setIsEditing(false);
        await fetchReviews(); // Refresh reviews list
        
        // Update form data with the saved review data
        setFormData({
          comment: data.data.comment,
          rating: data.data.rating
        });
      } else {
        setError(data.error || 'Failed to save review');
      }
    } catch (err) {
      setError('Failed to save review');
      console.error('Error saving review:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userReview || !authToken) return;

    setDeletingReview(true);
    try {
      const response = await fetch(`${baseUrl}/properties/reviews/${userReview.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      
      if (data.statusCode === 200) {
        setUserReview(null);
        setFormData({ comment: '', rating: 5 });
        setShowReviewForm(false);
        setIsEditing(false);
        setShowDeleteModal(false);
        await fetchReviews(); // Refresh reviews list
      } else {
        setError(data.error || 'Failed to delete review');
      }
    } catch (err) {
      setError('Failed to delete review');
      console.error('Error deleting review:', err);
    } finally {
      setDeletingReview(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const handleEditClick = () => {
    if (!userReview) return;
    
    setIsEditing(true);
    setShowReviewForm(true);
    setFormData({
      comment: userReview.comment,
      rating: userReview.rating
    });
  };

  const handleNewReviewClick = () => {
    // Double-check that user doesn't have an existing review
    if (userReview) {
      setError('You have already reviewed this property. You can edit your existing review.');
      return;
    }
    
    setShowReviewForm(true);
    setIsEditing(false);
    setFormData({ comment: '', rating: 5 });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowReviewForm(false);
    if (userReview) {
      setFormData({
        comment: userReview.comment,
        rating: userReview.rating
      });
    } else {
      setFormData({ comment: '', rating: 5 });
    }
  };

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  const renderStars = (rating: number, interactive: boolean = false) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`${styles.star} ${
          index < rating
            ? styles.starFilled
            : styles.starEmpty
        } ${interactive ? styles.starInteractive : ''}`}
        onClick={interactive ? () => setFormData(prev => ({ ...prev, rating: index + 1 })) : undefined}
      />
    ));
  };

  const renderRatingDistribution = () => {
    const maxCount = Math.max(...Object.values(reviewStats.ratingDistribution));
    
    return (
      <div className={styles.ratingDistribution}>
        {[5, 4, 3, 2, 1].map(rating => (
          <div key={rating} className={styles.ratingRow}>
            <span className={styles.ratingNumber}>{rating}</span>
            <Star className={styles.ratingRowStar} />
            <div className={styles.ratingBar}>
              <div
                className={styles.ratingBarFill}
                style={{
                  width: maxCount > 0 ? `${(reviewStats.ratingDistribution[rating] / maxCount) * 100}%` : '0%'
                }}
              />
            </div>
            <span className={styles.ratingCount}>
              {reviewStats.ratingDistribution[rating]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2 
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : username;
    return `${maskedUsername}@${domain}`;
  };

  // Show loading state while checking authentication or user review
  if (authLoading || (user?.role === 'user' && userReviewLoading)) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingText}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.errorAlert}>
          {error}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Delete Review</h3>
              <button 
                onClick={handleDeleteCancel}
                className={styles.modalCloseBtn}
                disabled={deletingReview}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                Are you sure you want to delete your review? This action cannot be undone.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={handleDeleteCancel}
                className={styles.modalCancelBtn}
                disabled={deletingReview}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className={styles.modalDeleteBtn}
                disabled={deletingReview}
              >
                {deletingReview ? 'Deleting...' : 'Delete Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Reviews</h2>
        
        {/* Show "Write a Review" button only if user is authenticated, is a regular user, and doesn't have an existing review */}
        {user?.role === 'user' && !userReview && !userReviewLoading && (
          <button
            onClick={handleNewReviewClick}
            className={styles.writeReviewBtn}
          >
            <Star className={styles.btnIcon} />
            <span>Write a Review</span>
          </button>
        )}
        
        {!user && (
          <div className={styles.loginPrompt}>
            Please log in to write a review
          </div>
        )}
      </div>

      {/* Rating Summary */}
      <div className={styles.ratingSummary}>
        <div className={styles.ratingSummaryGrid}>
          <div className={styles.averageRating}>
            <div className={styles.ratingNumber}>
              {reviewStats.averageRating.toFixed(1)}
            </div>
            <div className={styles.starRating}>
              {renderStars(Math.round(reviewStats.averageRating))}
            </div>
            <div className={styles.reviewCount}>
              {reviewStats.totalCount} {reviewStats.totalCount === 1 ? 'review' : 'reviews'}
            </div>
          </div>
          <div>
            <h3 className={styles.distributionTitle}>Rating Distribution</h3>
            {renderRatingDistribution()}
          </div>
        </div>
      </div>

      {/* User's Review Section - Only show if user has a review */}
      {user?.role === 'user' && userReview && (
        <div className={styles.userReview}>
          <div className={styles.userReviewHeader}>
            <h3 className={styles.userReviewTitle}>Your Review</h3>
            <div className={styles.userReviewActions}>
              <button
                onClick={handleEditClick}
                className={styles.editBtn}
                title="Edit Review"
                disabled={loading}
              >
                <Edit2 className={styles.actionIcon} />
              </button>
              <button
                onClick={handleDeleteClick}
                className={styles.deleteBtn}
                title="Delete Review"
                disabled={loading}
              >
                <Trash2 className={styles.actionIcon} />
              </button>
            </div>
          </div>
          <div className={styles.userReviewMeta}>
            {renderStars(userReview.rating)}
            <span className={styles.reviewDate}>
              {formatDate(userReview.date)}
            </span>
          </div>
          <p className={styles.userReviewComment}>{userReview.comment}</p>
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && user?.role === 'user' && (
        <div className={styles.reviewForm}>
          <h3 className={styles.formTitle}>
            {isEditing ? 'Edit Your Review' : 'Write a Review'}
          </h3>
          <form onSubmit={handleSubmitReview}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Rating
              </label>
              <div className={styles.ratingInput}>
                {renderStars(formData.rating, true)}
                <span className={styles.ratingText}>
                  {formData.rating} out of 5 stars
                </span>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Comment
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                className={styles.textarea}
                rows={4}
                placeholder="Share your experience..."
                required
                maxLength={1000}
              />
              <div className={styles.charCount}>
                {formData.comment.length}/1000 characters
              </div>
            </div>
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={loading || !formData.comment.trim()}
                className={styles.submitBtn}
              >
                {loading ? 'Saving...' : isEditing ? 'Update Review' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      <div className={styles.reviewsList}>
        {reviewStats.reviews.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare className={styles.emptyIcon} />
            <p>No reviews yet. Be the first to review this property!</p>
          </div>
        ) : (
          reviewStats.reviews.map((review) => (
            <div key={review.id} className={styles.reviewItem}>
              <div className={styles.reviewHeader}>
                <div className={styles.reviewerInfo}>
                  <div className={styles.reviewerAvatar}>
                    <span className={styles.reviewerInitial}>
                      {review.userEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.reviewerDetails}>
                    <div className={styles.reviewerName}>
                      {maskEmail(review.userEmail)}
                    </div>
                    <div className={styles.reviewDate}>
                      {formatDate(review.date)}
                    </div>
                  </div>
                </div>
                <div className={styles.reviewStars}>
                  {renderStars(review.rating)}
                </div>
              </div>
              <div className={styles.reviewContent}>
                {review.comment}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {reviewStats.totalCount > 10 && (
        <div className={styles.pagination}>
          <div className={styles.paginationControls}>
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className={styles.paginationBtn}
            >
              Previous
            </button>
            <span className={styles.paginationInfo}>
              Page {page} of {Math.ceil(reviewStats.totalCount / 10)}
            </span>
            <button
              onClick={() => setPage(prev => prev + 1)}
              disabled={page >= Math.ceil(reviewStats.totalCount / 10)}
              className={styles.paginationBtn}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyReview;