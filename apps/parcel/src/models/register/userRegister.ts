import { IUser } from '@server/types';
import mongoose, { Model, Schema } from 'mongoose';
import { coordinatesSchema } from './coordinatesSchema';

const UserSchema = new Schema<IUser>(
  {
    personalInfo: {
      familyName: String,
      givenName: String,
      email: String,
      phone: String,
      avatar: {
        public_id: String,
        url: String,
      },
    },
    location: { type: coordinatesSchema },
    role: {
      type: String,
      default: 'user',
      required: true,
      immutable: true,
    },
  },
  { timestamps: true }
);

UserSchema.index({ 'personalInfo.email': 1 });
UserSchema.index({ 'personalInfo.phone': 1 });

UserSchema.index({ 'personalInfo.familyName': 1 });
UserSchema.index({ 'personalInfo.givenName': 1 });

UserSchema.index({
  'personalInfo.familyName': 'text',
  'personalInfo.givenName': 'text',
  'personalInfo.email': 'text',
});

UserSchema.index({ role: 1 });

UserSchema.index({ createdAt: -1 });

export const Seller: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
