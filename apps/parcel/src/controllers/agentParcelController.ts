import { Parcel } from '../models/parcel/ParcelModel';
import { ParcelAgentServices } from '../services/ParcelAgentServices';

export const agentParcelController = new ParcelAgentServices({
  model: Parcel,
});
