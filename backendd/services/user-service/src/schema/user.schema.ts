import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'users', timestamps: true }) 
 class User extends Document {
  @Prop()
  fullname: string;

  @Prop({ required: true, unique: true })
  email: string;

  /*@Prop()
  password: string;*/

  @Prop({ unique: true })
  firebaseUid: string;

  @Prop()
  role: string;

  @Prop()
emailVerified: Boolean; 
}



export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.set('versionKey', false); 
export { User }
