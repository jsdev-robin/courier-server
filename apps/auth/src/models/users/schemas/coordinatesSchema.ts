import { ICoordinates } from '@server/types';
import { Schema } from 'mongoose';

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
