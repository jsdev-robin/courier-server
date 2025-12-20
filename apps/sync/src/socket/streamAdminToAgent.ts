import { Server } from 'socket.io';
import { Parcel } from '../models/parcel/ParcelModel';

export async function streamAdminToAgent(io: Server) {
  const ns = io.of('/stream/admintToAgent');

  const changeStream = Parcel.watch([], { fullDocument: 'updateLookup' });

  changeStream.on('change', (change) => {
    if (change.operationType === 'update') {
      if (change.updateDescription.updatedFields.status === 'Assigned') {
        ns.emit('updateAssigned', change.fullDocument);
      }
    }
  });

  ns.on('connection', async (socket) => {
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
