import { Document, Types } from 'mongoose';

export enum ParcelStatus {
  BOOKED = 'Booked',
  ASSIGNED = 'Assigned',
  PICKED_UP = 'Picked Up',
  IN_TRANSIT = 'In Transit',
  DELIVERED = 'Delivered',
  FAILED = 'Failed',
}

export enum ParcelSize {
  SMALL = 'Small',
  MEDIUM = 'Medium',
  LARGE = 'Large',
}

export enum PaymentType {
  COD = 'COD',
  PREPAID = 'Prepaid',
}

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

  pickupAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates: ICoordinates;
    contactName: string;
    contactPhone: string;
  };

  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates: ICoordinates;
    contactName: string;
    contactPhone: string;
  };

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
  currentLocation?: ICoordinates;

  estimatedDelivery?: Date;
  actualDelivery?: Date;
  pickupDate?: Date;

  trackingHistory: ITrackingHistory[];

  qrCode?: string;
  barcode?: string;

  createdAt: Date;
  updatedAt: Date;
}
