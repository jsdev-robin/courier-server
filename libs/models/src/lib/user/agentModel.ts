import { IUser } from '@server/types';
import mongoose, { Model, Schema } from 'mongoose';
import { coordinatesSchema } from '../schemas/coordinatesSchema';

const AgentSchema = new Schema<IUser>(
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
      default: 'agent',
      required: true,
      immutable: true,
    },
  },
  { timestamps: true }
);

AgentSchema.index({ 'personalInfo.email': 1 });
AgentSchema.index({ 'personalInfo.phone': 1 });

AgentSchema.index({ 'personalInfo.familyName': 1 });
AgentSchema.index({ 'personalInfo.givenName': 1 });

AgentSchema.index({
  'personalInfo.familyName': 'text',
  'personalInfo.givenName': 'text',
  'personalInfo.email': 'text',
});

AgentSchema.index({ role: 1 });

AgentSchema.index({ createdAt: -1 });

export const Seller: Model<IUser> = mongoose.model<IUser>('Agent', AgentSchema);
