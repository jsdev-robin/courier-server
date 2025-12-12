import { Schema } from 'mongoose';
import { ITrackingHistory } from '../types';
import { coordinatesSchema } from './coordinatesSchema';

export enum ParcelStatus {
  BOOKED = 'Booked',
  ASSIGNED = 'Assigned',
  PICKED_UP = 'Picked Up',
  IN_TRANSIT = 'In Transit',
  DELIVERED = 'Delivered',
  FAILED = 'Failed',
}

export const trackingHistorySchema = new Schema<ITrackingHistory>(
  {
    status: { type: String, enum: Object.values(ParcelStatus), required: true },
    location: { type: coordinatesSchema },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);
