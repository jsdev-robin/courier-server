import { Schema } from 'mongoose';
import { ITrackingHistory } from '../types';

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
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);
