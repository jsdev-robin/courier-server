import { Schema } from 'mongoose';

export interface ICoordinates {
  type: 'Point';
  coordinates: [number, number];
}

export const coordinatesSchema = new Schema<ICoordinates>(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  { _id: false }
);
