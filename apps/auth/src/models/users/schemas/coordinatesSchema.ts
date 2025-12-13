import { ICoordinates } from '@server/types';
import { Schema } from 'mongoose';

export const coordinatesSchema = new Schema<ICoordinates>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);
