import { body, param } from 'express-validator';
import { ParcelStatus } from '../models/parcel/schemas/trackingHistorySchema';

const create = [
  // Pickup Address
  body('pickupAddress.street')
    .isString()
    .withMessage('Pickup street must be a string')
    .notEmpty()
    .withMessage('Pickup street is required'),

  body('pickupAddress.city')
    .isString()
    .withMessage('Pickup city must be a string')
    .notEmpty()
    .withMessage('Pickup city is required'),

  body('pickupAddress.state')
    .isString()
    .withMessage('Pickup state must be a string')
    .notEmpty()
    .withMessage('Pickup state is required'),

  body('pickupAddress.country')
    .isString()
    .withMessage('Pickup country must be a string')
    .notEmpty()
    .withMessage('Pickup country is required'),

  body('pickupAddress.postalCode')
    .isString()
    .withMessage('Pickup postal code must be a string')
    .notEmpty()
    .withMessage('Pickup postal code is required'),

  body('pickupAddress.contactName')
    .isString()
    .withMessage('Pickup contact name must be a string')
    .notEmpty()
    .withMessage('Pickup contact name is required'),

  body('pickupAddress.contactPhone')
    .isString()
    .withMessage('Pickup contact phone must be a string')
    .notEmpty()
    .withMessage('Pickup contact phone is required'),

  body('pickupAddress.coordinates.lat')
    .isFloat()
    .withMessage('Pickup latitude must be a valid number'),

  body('pickupAddress.coordinates.lng')
    .isFloat()
    .withMessage('Pickup longitude must be a valid number'),

  body('pickupAddress.coordinates.address')
    .optional()
    .isString()
    .withMessage('Pickup address line must be a string'),

  // Delivery Address
  body('deliveryAddress.street')
    .isString()
    .withMessage('Delivery street must be a string')
    .notEmpty()
    .withMessage('Delivery street is required'),

  body('deliveryAddress.city')
    .isString()
    .withMessage('Delivery city must be a string')
    .notEmpty()
    .withMessage('Delivery city is required'),

  body('deliveryAddress.state')
    .isString()
    .withMessage('Delivery state must be a string')
    .notEmpty()
    .withMessage('Delivery state is required'),

  body('deliveryAddress.country')
    .isString()
    .withMessage('Delivery country must be a string')
    .notEmpty()
    .withMessage('Delivery country is required'),

  body('deliveryAddress.postalCode')
    .isString()
    .withMessage('Delivery postal code must be a string')
    .notEmpty()
    .withMessage('Delivery postal code is required'),

  body('deliveryAddress.contactName')
    .isString()
    .withMessage('Delivery contact name must be a string')
    .notEmpty()
    .withMessage('Delivery contact name is required'),

  body('deliveryAddress.contactPhone')
    .isString()
    .withMessage('Delivery contact phone must be a string')
    .notEmpty()
    .withMessage('Delivery contact phone is required'),

  body('deliveryAddress.coordinates.lat')
    .isFloat()
    .withMessage('Delivery latitude must be a valid number'),

  body('deliveryAddress.coordinates.lng')
    .isFloat()
    .withMessage('Delivery longitude must be a valid number'),

  body('deliveryAddress.coordinates.address')
    .optional()
    .isString()
    .withMessage('Delivery address must be a string'),

  // Parcel Details
  body('parcelDetails.size')
    .isString()
    .withMessage('Parcel size must be a string')
    .notEmpty()
    .withMessage('Parcel size is required')
    .isIn(['Small', 'Medium', 'Large'])
    .withMessage('Parcel size must be Small, Medium, or Large'),

  body('parcelDetails.weight')
    .isFloat({ gt: 0 })
    .withMessage('Parcel weight must be a number greater than 0'),

  body('parcelDetails.type')
    .isString()
    .withMessage('Parcel type must be a string')
    .notEmpty()
    .withMessage('Parcel type is required'),

  body('parcelDetails.description')
    .optional()
    .isString()
    .withMessage('Parcel description must be a string'),

  // Payment
  body('payment.type')
    .isIn(['COD', 'Prepaid'])
    .withMessage('Payment type must be COD or Prepaid')
    .notEmpty()
    .withMessage('Payment type is required'),

  body('payment.amount')
    .isFloat({ gt: 0 })
    .withMessage('Payment amount must be greater than 0')
    .notEmpty()
    .withMessage('Payment amount is required'),

  body('payment.codAmount')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('COD amount must be a number greater than 0'),

  body('payment.status')
    .optional()
    .isIn(['Pending', 'Paid', 'Failed'])
    .withMessage('Payment status must be Pending, Paid, or Failed'),

  // Current Location
  body('currentLocation').optional(),
  body('currentLocation.lat')
    .optional()
    .isFloat()
    .withMessage('Current latitude must be a valid number'),
  body('currentLocation.lng')
    .optional()
    .isFloat()
    .withMessage('Current longitude must be a valid number'),
  body('currentLocation.address')
    .optional()
    .isString()
    .withMessage('Current location address must be a string'),

  // Dates
  body('estimatedDelivery')
    .optional()
    .isISO8601()
    .withMessage('Estimated delivery must be a valid date'),
  body('pickupDate')
    .optional()
    .isISO8601()
    .withMessage('Pickup date must be a valid date'),
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
