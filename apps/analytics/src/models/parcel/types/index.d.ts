import { Document, Types } from 'mongoose';

export interface ICoordinates {
  lat: number;
  lng: number;
  address?: string;
}

export interface ITrackingHistory {
  status: ParcelStatus;
  location?: ICoordinates;
  timestamp: Date;
  notes?: string;
}

export interface IParcel extends Document {
  trackingNumber: string;
  customer: Types.ObjectId;
  assignedAgent?: Types.ObjectId;

  parcelDetails: {
    size: ParcelSize;
    weight: number;
    type: string;
    description?: string;
  };

  payment: {
    type: PaymentType;
    amount: number;
    codAmount?: number;
    status: 'Pending' | 'Paid' | 'Failed';
  };

  status: ParcelStatus;

  createdAt: Date;
  updatedAt: Date;
}
