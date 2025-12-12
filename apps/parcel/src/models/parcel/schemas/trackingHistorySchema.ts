import { Schema } from 'mongoose';
import { ITrackingHistory, ParcelStatus } from '../types';
import { coordinatesSchema } from './coordinatesSchema';

export const trackingHistorySchema = new Schema<ITrackingHistory>(
  {
    status: { type: String, enum: Object.values(ParcelStatus), required: true },
    location: { type: coordinatesSchema },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);
