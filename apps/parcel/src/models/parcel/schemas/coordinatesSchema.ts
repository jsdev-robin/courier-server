import { Schema } from 'mongoose';
import { ICoordinates } from '../types';

export const coordinatesSchema = new Schema<ICoordinates>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
  },
  { _id: false }
);
