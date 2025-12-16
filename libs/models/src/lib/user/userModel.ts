import { IUser } from '@server/types';
import mongoose, { Model, Schema } from 'mongoose';
import { coordinatesSchema } from '../schemas/coordinatesSchema';

const UserSchema = new Schema<IUser>(
  {
    personalInfo: {
      familyName: { type: String },
      givenName: { type: String },
      avatar: {
        public_id: { type: String },
        url: { type: String },
      },
      email: { type: String,  },
      phone: { type: String },
      address: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        coordinates: [String],
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

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
