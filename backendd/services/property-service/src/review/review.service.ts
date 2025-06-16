// src/review/review.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from '../schema/review.schema';
import { Property } from '../schema/property.schema';
import { CreateReviewDto, UpdateReviewDto, GetReviewsDto, GetReviewsByHostDto } from '../dto/review.dto';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';




interface ReviewNotification {
  reviewId: string;
  propertyId: string;
  hostId: string; // You'll need to get this from the property
  userEmail: string;
  rating: number;
  comment?: string;
  propertyName?: string;
}

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Property.name) private propertyModel: Model<Property>,
     @Inject('HOST_SERVICE') private hostServiceClient: ClientProxy,
  ) {}

  async createReview(createReviewDto: CreateReviewDto): Promise<ReviewDocument> {
    try {
      console.log('Creating review:', createReviewDto);

      // Validate that property exists
      const property = await this.propertyModel.findById(createReviewDto.propertyId);
      if (!property) {
        throw new NotFoundException('Property not found');
      }

      // Check if user has already reviewed this property
      const existingReview = await this.reviewModel.findOne({
        propertyId: new Types.ObjectId(createReviewDto.propertyId),
        userEmail: createReviewDto.userEmail,
        isActive: true
      });

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this property');
      }

      const review = new this.reviewModel({
        ...createReviewDto,
        propertyId: new Types.ObjectId(createReviewDto.propertyId),
        date: new Date()
      });

      const savedReview = await review.save();
      console.log('Review created successfully:', savedReview);

      // Update property rating statistics
      await this.updatePropertyRatingStats(createReviewDto.propertyId);


      // Emit event to notify host service about new review
      const reviewNotification: ReviewNotification = {
        reviewId: savedReview._id.toString(),
        propertyId: savedReview.propertyId.toString(),
        hostId: savedReview.hostUid, // Assuming your Property schema has hostId
        userEmail: createReviewDto.userEmail,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
        propertyName: property.title, // Adjust based on your Property schema
      };

      // Emit the event (fire and forget - no need to wait for response)
      this.hostServiceClient.emit('new_review_created', reviewNotification);
      console.log('Review notification event emitted for host:', savedReview.hostUid);

      return savedReview;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  async getReviewsByPropertyId(getReviewsDto: GetReviewsDto): Promise<{
    reviews: ReviewDocument[];
    totalCount: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      const { propertyId, page = 1, limit = 10 } = getReviewsDto;
      const skip = (page - 1) * limit;

      console.log(`Getting reviews for property: ${propertyId}, page: ${page}, limit: ${limit}`);

      const propertyObjectId = new Types.ObjectId(propertyId);

      // Get reviews with pagination
      const reviews = await this.reviewModel
        .find({ propertyId: propertyObjectId, isActive: true })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      // Get total count
      const totalCount = await this.reviewModel.countDocuments({ 
        propertyId: propertyObjectId, 
        isActive: true 
      });

      // Calculate average rating
      const ratingStats = await this.reviewModel.aggregate([
        { $match: { propertyId: propertyObjectId, isActive: true } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            ratings: { $push: '$rating' }
          }
        }
      ]);

      const averageRating = ratingStats.length > 0 ? parseFloat(ratingStats[0].averageRating.toFixed(1)) : 0;

      // Calculate rating distribution
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      if (ratingStats.length > 0) {
        ratingStats[0].ratings.forEach((rating: number) => {
          ratingDistribution[rating]++;
        });
      }

      console.log(`Found ${reviews.length} reviews for property ${propertyId}`);

      return {
        reviews,
        totalCount,
        averageRating,
        ratingDistribution
      };
    } catch (error) {
      console.error('Error getting reviews:', error);
      throw new BadRequestException(`Failed to fetch reviews: ${error.message}`);
    }
  }

  async getReviewsByHostUid(getReviewsByHostDto: GetReviewsByHostDto): Promise<{
    reviews: ReviewDocument[];
    totalCount: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      const { hostUid, page = 1, limit = 10 } = getReviewsByHostDto;
      const skip = (page - 1) * limit;

      console.log(`Getting reviews for host: ${hostUid}, page: ${page}, limit: ${limit}`);

      // Get reviews with pagination
      const reviews = await this.reviewModel
        .find({ hostUid: hostUid, isActive: true })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('propertyId', 'name address images') // Populate property details if needed
        .exec();

      // Get total count
      const totalCount = await this.reviewModel.countDocuments({ 
        hostUid: hostUid, 
        isActive: true 
      });

      // Calculate average rating and rating distribution
      const ratingStats = await this.reviewModel.aggregate([
        { $match: { hostUid: hostUid, isActive: true } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            ratings: { $push: '$rating' }
          }
        }
      ]);

      const averageRating = ratingStats.length > 0 ? parseFloat(ratingStats[0].averageRating.toFixed(1)) : 0;

      // Calculate rating distribution
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      if (ratingStats.length > 0) {
        ratingStats[0].ratings.forEach((rating: number) => {
          ratingDistribution[rating]++;
        });
      }

      console.log(`Found ${reviews.length} reviews for host ${hostUid}`);

      return {
        reviews,
        totalCount,
        averageRating,
        ratingDistribution
      };
    } catch (error) {
      console.error('Error getting host reviews:', error);
      throw new BadRequestException(`Failed to fetch host reviews: ${error.message}`);
    }
  }

  async updateReview(reviewId: string, userEmail: string, updateReviewDto: UpdateReviewDto): Promise<ReviewDocument> {
    try {
      console.log(`Updating review ${reviewId} for user ${userEmail}`);

      const review = await this.reviewModel.findById(reviewId);
      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Check if the user owns this review
      if (review.userEmail !== userEmail) {
        throw new ForbiddenException('You can only update your own reviews');
      }

      const updatedReview = await this.reviewModel.findByIdAndUpdate(
        reviewId,
        { ...updateReviewDto },
        { new: true }
      );

      if (!updatedReview) {
        throw new NotFoundException('Review not found after update');
      }

      // Update property rating statistics
      await this.updatePropertyRatingStats(review.propertyId.toString());

      console.log('Review updated successfully:', updatedReview);
      return updatedReview;
    } catch (error) {
      console.error('Error updating review:', error);
      throw error;
    }
  }

  async deleteReview(reviewId: string, userEmail: string): Promise<void> {
    try {
      console.log(`Deleting review ${reviewId} for user ${userEmail}`);

      const review = await this.reviewModel.findById(reviewId);
      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Check if the user owns this review
      if (review.userEmail !== userEmail) {
        throw new ForbiddenException('You can only delete your own reviews');
      }

      // Soft delete by setting isActive to false
      await this.reviewModel.findByIdAndUpdate(reviewId, { isActive: false });

      // Update property rating statistics
      await this.updatePropertyRatingStats(review.propertyId.toString());

      console.log('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }

  async getUserReviewForProperty(propertyId: string, userEmail: string): Promise<ReviewDocument | null> {
    try {
      const review = await this.reviewModel.findOne({
        propertyId: new Types.ObjectId(propertyId),
        userEmail,
        isActive: true
      });

      return review;
    } catch (error) {
      console.error('Error getting user review:', error);
      throw new BadRequestException(`Failed to fetch user review: ${error.message}`);
    }
  }

  private async updatePropertyRatingStats(propertyId: string): Promise<void> {
    try {
      const stats = await this.reviewModel.aggregate([
        { 
          $match: { 
            propertyId: new Types.ObjectId(propertyId), 
            isActive: true 
          } 
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 }
          }
        }
      ]);

      const updateData = stats.length > 0 
        ? {
            rating: parseFloat(stats[0].averageRating.toFixed(1)),
            reviewCount: stats[0].reviewCount
          }
        : {
            rating: 0,
            reviewCount: 0
          };

      await this.propertyModel.findByIdAndUpdate(propertyId, updateData);
      console.log(`Updated property ${propertyId} rating stats:`, updateData);
    } catch (error) {
      console.error('Error updating property rating stats:', error);
    }
  }

  // Additional helper method to get host statistics
  async getHostStatistics(hostUid: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
    totalProperties: number;
  }> {
    try {
      console.log(`Getting statistics for host: ${hostUid}`);

      // Get total reviews and rating stats
      const reviewStats = await this.reviewModel.aggregate([
        { $match: { hostUid: hostUid, isActive: true } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            ratings: { $push: '$rating' }
          }
        }
      ]);

      // Get total properties for this host
      const totalProperties = await this.propertyModel.countDocuments({ 
        hostUid: hostUid, 
        isActive: true 
      });

      const stats = reviewStats.length > 0 ? reviewStats[0] : null;
      const averageRating = stats ? parseFloat(stats.averageRating.toFixed(1)) : 0;
      const totalReviews = stats ? stats.totalReviews : 0;

      // Calculate rating distribution
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      if (stats && stats.ratings) {
        stats.ratings.forEach((rating: number) => {
          ratingDistribution[rating]++;
        });
      }

      return {
        totalReviews,
        averageRating,
        ratingDistribution,
        totalProperties
      };
    } catch (error) {
      console.error('Error getting host statistics:', error);
      throw new BadRequestException(`Failed to fetch host statistics: ${error.message}`);
    }
  }
}