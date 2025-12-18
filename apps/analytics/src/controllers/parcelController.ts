import { ParcelAdminServices } from '../services/parcel/ParcelAdminServices';
import { ParcelAgentServices } from '../services/parcel/ParcelAgentServices';

export const parcelAdminController = new ParcelAdminServices();
export const parcelAgentController = new ParcelAgentServices();
