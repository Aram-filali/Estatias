import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PropertyController } from './app.controller';
import { PropertyService } from './app.service';
import { PropertySchema, Property } from './schema/property.schema';  // Importer le schéma
import { DatabaseModule } from '../config/database.module';
import { MessagingModule } from './messaging/messaging.module';
import { ConfigModule } from '@nestjs/config';
import { AIModule } from './AI/ai.module';


@Module({
  imports: [
      ConfigModule.forRoot({
      isGlobal: true, // Makes config available globally
    }),
    MongooseModule.forFeature([{ name: Property.name, schema: PropertySchema }]),
    DatabaseModule,
    MessagingModule,
    AIModule
  ],
  controllers: [PropertyController],
  providers: [PropertyService],

})
export class PropertyModule {}
