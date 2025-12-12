import { Parcel } from '../models/parcel/ParcelModel';
import { ParcelCustomerServices } from '../services/ParcelCustomerServices';

export const customerParcelController = new ParcelCustomerServices({
  model: Parcel,
});
