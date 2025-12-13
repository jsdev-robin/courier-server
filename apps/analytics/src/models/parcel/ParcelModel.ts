import mongoose, { Schema } from 'mongoose';
import { IParcel } from './types';

enum ParcelSize {
  SMALL = 'Small',
  MEDIUM = 'Medium',
  LARGE = 'Large',
}

enum PaymentType {
  COD = 'COD',
  PREPAID = 'Prepaid',
}

export enum ParcelStatus {
  BOOKED = 'Booked',
  ASSIGNED = 'Assigned',
  PICKED_UP = 'Picked Up',
  IN_TRANSIT = 'In Transit',
  DELIVERED = 'Delivered',
  FAILED = 'Failed',
}

const parcelSchema = new Schema<IParcel>(
  {
    trackingNumber: {
      type: String,
      required: true,
    },

    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
    },

    parcelDetails: {
      size: { type: String, enum: Object.values(ParcelSize), required: true },
      weight: { type: Number, required: true },
      type: { type: String, required: true },
      description: { type: String },
    },

    payment: {
      type: { type: String, enum: Object.values(PaymentType), required: true },
      amount: { type: Number, required: true },
      codAmount: { type: Number },
      status: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending',
      },
    },

    status: {
      type: String,
      enum: Object.values(ParcelStatus),
      default: ParcelStatus.BOOKED,
    },
  },
  {
    timestamps: true,
  }
);

parcelSchema.index({ trackingNumber: 1 });
parcelSchema.index({ customer: 1 });
parcelSchema.index({ assignedAgent: 1 });
parcelSchema.index({ status: 1 });
parcelSchema.index({ createdAt: -1 });

export const Parcel = mongoose.model<IParcel>('Parcel', parcelSchema);
