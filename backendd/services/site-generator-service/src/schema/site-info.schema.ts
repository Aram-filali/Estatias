import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'Site Info',timestamps: true })
export class SiteInfo {
    @Prop({ required: true, unique: true })
    hostId: string;

    @Prop({ required: true })
    outputPath: string;

    @Prop({ 
        required: true,
        enum: ['building', 'ready', 'error'],
        default: 'building'
    })
    status: string;

    @Prop()
    error?: string;

    @Prop()
    port?: number;

    @Prop()
    url?: string;

    @Prop()
    lastBuilt?: Date;

    @Prop()
    lastStarted?: Date;

    @Prop()
    lastStopped?: Date;
}

export type SiteInfoDocument = SiteInfo & Document;
export const SiteInfoSchema = SchemaFactory.createForClass(SiteInfo);