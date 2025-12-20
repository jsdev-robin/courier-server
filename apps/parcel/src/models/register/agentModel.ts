import { coordinatesSchema } from '@server/models';
import { IUser } from '@server/types';
import mongoose, { Model, Schema } from 'mongoose';

const AgentSchema = new Schema<IUser>(
  {
    personalInfo: {
      familyName: { type: String },
      givenName: { type: String },
      avatar: {
        public_id: { type: String },
        url: { type: String },
      },
      email: { type: String },
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

export const Agent: Model<IUser> = mongoose.model<IUser>('Agent', AgentSchema);
