// src/review/review.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewController } from './review.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ReviewService } from './review.service';
import { Review, ReviewSchema } from '../schema/review.schema';
import { Property, PropertySchema } from '../schema/property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Property.name, schema: PropertySchema }
    ]),
    // Add ClientsModule for communicating with host service
    ClientsModule.register([
      {
        name: 'HOST_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.HOST_SERVICE_HOST || 'localhost',
          port: 3003,
        },
      },
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}