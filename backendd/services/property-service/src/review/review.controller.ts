// src/controllers/review.controller.ts
import { Controller, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto, GetReviewsDto } from '../dto/review.dto';
import { ReviewDocument } from '../schema/review.schema';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @MessagePattern({ cmd: 'create_review' })
  async createReview(@Payload(ValidationPipe) data: CreateReviewDto & { userEmail: string }) {
    try {
      console.log('Creating review with data:', data);
      
      const review: ReviewDocument = await this.reviewService.createReview(data);
      
      return {
        statusCode: 201,
        data: {
          ...review.toObject(),
          id: review._id.toString()
        },
        message: 'Review created successfully'
      };
    } catch (error) {
      console.error('Error in create review controller:', error);
      return {
        statusCode: error.status || 500,
        data: null,
        error: error.message || 'Failed to create review'
      };
    }
  }

  @MessagePattern({ cmd: 'get_reviews_by_property' })
  async getReviewsByProperty(@Payload(ValidationPipe) data: GetReviewsDto) {
    try {
      console.log('Getting reviews for property:', data);
      
      const result = await this.reviewService.getReviewsByPropertyId(data);
      
      return {
        statusCode: 200,
        data: {
          ...result,
          reviews: result.reviews.map((review: ReviewDocument) => ({
            ...review.toObject(),
            id: review._id.toString()
          }))
        }
      };
    } catch (error) {
      console.error('Error in get reviews controller:', error);
      return {
        statusCode: error.status || 500,
        data: null,
        error: error.message || 'Failed to get reviews'
      };
    }
  }

  @MessagePattern({ cmd: 'get_reviews_by_host' })
  async getReviewsByHost(@Payload(ValidationPipe) data: { hostUid: string; page?: number; limit?: number }) {
    try {
      console.log('Getting reviews for host:', data);
      
      const result = await this.reviewService.getReviewsByHostUid({
        hostUid: data.hostUid,
        page: data.page || 1,
        limit: data.limit || 10
      });
      
      return {
        statusCode: 200,
        data: {
          ...result,
          reviews: result.reviews.map((review: ReviewDocument) => ({
            ...review.toObject(),
            id: review._id.toString()
          }))
        }
      };
    } catch (error) {
      console.error('Error in get host reviews controller:', error);
      return {
        statusCode: error.status || 500,
        data: null,
        error: error.message || 'Failed to get host reviews'
      };
    }
  }

  @MessagePattern({ cmd: 'update_review' })
  async updateReview(@Payload(ValidationPipe) data: { reviewId: string; userEmail: string } & UpdateReviewDto) {
    try {
      console.log('Updating review:', data);
      
      const { reviewId, userEmail, ...updateData } = data;
      const review: ReviewDocument = await this.reviewService.updateReview(reviewId, userEmail, updateData);
      
      return {
        statusCode: 200,
        data: {
          ...review.toObject(),
          id: review._id.toString()
        },
        message: 'Review updated successfully'
      };
    } catch (error) {
      console.error('Error in update review controller:', error);
      return {
        statusCode: error.status || 500,
        data: null,
        error: error.message || 'Failed to update review'
      };
    }
  }

  @MessagePattern({ cmd: 'delete_review' })
  async deleteReview(@Payload() data: { reviewId: string; userEmail: string }) {
    try {
      console.log('Deleting review:', data);
      
      await this.reviewService.deleteReview(data.reviewId, data.userEmail);
      
      return {
        statusCode: 200,
        data: null,
        message: 'Review deleted successfully'
      };
    } catch (error) {
      console.error('Error in delete review controller:', error);
      return {
        statusCode: error.status || 500,
        data: null,
        error: error.message || 'Failed to delete review'
      };
    }
  }

  @MessagePattern({ cmd: 'get_user_review_for_property' })
  async getUserReviewForProperty(@Payload() data: { propertyId: string; userEmail: string }) {
    try {
      console.log('Getting user review for property:', data);
      
      const review: ReviewDocument | null = await this.reviewService.getUserReviewForProperty(data.propertyId, data.userEmail);
      
      return {
        statusCode: 200,
        data: review ? {
          ...review.toObject(),
          id: review._id.toString()
        } : null
      };
    } catch (error) {
      console.error('Error in get user review controller:', error);
      return {
        statusCode: error.status || 500,
        data: null,
        error: error.message || 'Failed to get user review'
      };
    }
  }
}