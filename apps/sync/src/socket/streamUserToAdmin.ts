import { Server } from 'socket.io';
import { Parcel } from '../models/parcel/ParcelModel';

export async function streamUserToAdmin(io: Server) {
  const ns = io.of('/stream/userToAdmin');

  const changeStream = await Parcel.watch();

  changeStream.on('change', (change) => {
    if (change.operationType === 'insert') {
      ns.emit('insertParcel', change.fullDocument);
    }
  });

  ns.on('connection', async (socket) => {
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
