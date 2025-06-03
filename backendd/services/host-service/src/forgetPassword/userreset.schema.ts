import { Schema, model, Document } from 'mongoose';

export interface User extends Document {
  email: string;  
  password: string;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
}

const userSchema = new Schema<User>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetPasswordToken: { type: String, required: false },
  resetPasswordExpires: { type: Date, required: false },
});

const UserModel = model<User>('User', userSchema);

export default UserModel;
