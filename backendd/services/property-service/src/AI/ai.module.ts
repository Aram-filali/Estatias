import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { PropertySchema, Property } from '../schema/property.schema';  // Importer le schéma
import { DatabaseModule } from './database.module';
import { MessagingModule } from '../messaging/messaging.module';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }]),
    DatabaseModule,
    MessagingModule,
  ],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],

})
export class AIModule {}
