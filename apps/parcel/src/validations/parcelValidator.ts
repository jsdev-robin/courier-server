import { body, param } from 'express-validator';
import { ParcelStatus } from '../models/parcel/schemas/trackingHistorySchema';

const create = [
  body('deliveryAddress.street').notEmpty().withMessage('Street is required'),
  body('deliveryAddress.city').notEmpty().withMessage('City is required'),
  body('deliveryAddress.state').notEmpty().withMessage('State is required'),
  body('deliveryAddress.country').notEmpty().withMessage('Country is required'),
  body('deliveryAddress.postalCode')
    .notEmpty()
    .withMessage('Postal code is required'),
  body('deliveryAddress.location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array with 2 numbers'),
  body('deliveryAddress.location.coordinates.*')
    .isFloat()
    .withMessage('Longitude and Latitude must be numbers'),
  body('deliveryAddress.contactName')
    .notEmpty()
    .withMessage('Contact name is required'),
  body('deliveryAddress.contactPhone')
    .notEmpty()
    .withMessage('Contact phone is required'),

  body('parcelDetails.size')
    .notEmpty()
    .withMessage('Parcel size is required')
    .isIn(['Small', 'Medium', 'Large'])
    .withMessage('Parcel size must be one of: Small, Medium, Large'),
  body('parcelDetails.weight').isFloat().withMessage('Weight must be a number'),
  body('parcelDetails.category')
    .notEmpty()
    .withMessage('Parcel category is required'),
  body('parcelDetails.description').optional(),

  body('payment.method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['COD', 'Prepaid'])
    .withMessage('Payment method must be one of: COD, Prepaid'),
  body('payment.amount').isFloat().withMessage('Amount must be a number'),
  body('payment.codAmount')
    .optional()
    .isFloat()
    .withMessage('COD amount must be a number'),
];

export const status = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(
      Object.values(ParcelStatus).filter(
        (status) => status !== ParcelStatus.BOOKED
      )
    )
    .withMessage('Invalid parcel status'),
];

export const trackingNumber = [
  param('trackingNumber')
    .notEmpty()
    .withMessage('Tracking number is required')
    .isString()
    .withMessage('Tracking number must be a string'),
];

export const parcelValidator = {
  create,
  status,
  trackingNumber,
};
