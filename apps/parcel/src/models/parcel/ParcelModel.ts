import { coordinatesSchema } from '@server/models';
import mongoose, { Schema } from 'mongoose';
import '../register/agentRegister';
import '../register/userRegister';
import {
  ParcelStatus,
  trackingHistorySchema,
} from './schemas/trackingHistorySchema';
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

    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      postalCode: { type: String, required: true },
      location: { type: coordinatesSchema, required: true },
      contactName: { type: String, required: true },
      contactPhone: { type: String, required: true },
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
    trackingHistory: [trackingHistorySchema],
    qrCode: { type: String },
    barcode: { type: String },
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
