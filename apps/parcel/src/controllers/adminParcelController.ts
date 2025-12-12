import { Parcel } from '../models/parcel/ParcelModel';
import { ParcelAdminServices } from '../services/ParcelAdminServices';

export const adminParcelController = new ParcelAdminServices({
  model: Parcel,
});
