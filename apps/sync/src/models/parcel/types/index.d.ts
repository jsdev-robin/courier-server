import { ICoordinates } from '@server/models';
import { Document, Types } from 'mongoose';

export interface ITrackingHistory {
  status: ParcelStatus;
  timestamp: Date;
  notes?: string;
}

export interface IParcel extends Document {
  trackingNumber: string;
  customer: Types.ObjectId;
  assignedAgent?: Types.ObjectId;

  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    location: ICoordinates;
    contactName: string;
    contactPhone: string;
  };

  parcelDetails: {
    size: ParcelSize;
    weight: number;
    category: string;
    description?: string;
  };

  payment: {
    method: PaymentType;
    amount: number;
    codAmount?: number;
    status: 'Pending' | 'Paid' | 'Failed';
  };

  status: ParcelStatus;

  trackingHistory: ITrackingHistory[];

  qrCode?: string;
  barcode?: string;

  createdAt: Date;
  updatedAt: Date;
}
