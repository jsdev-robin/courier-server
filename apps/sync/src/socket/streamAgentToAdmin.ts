import { Server } from 'socket.io';
import { Parcel } from '../models/parcel/ParcelModel';

export async function streamAgentToAdmin(io: Server) {
  const ns = io.of('/stream/agentToAdmin');

  const changeStream = await Parcel.watch();

  changeStream.on('change', (change) => {
    if (change.operationType === 'update') {
      ns.emit('updateRefetch', true);
    }
  });

  ns.on('connection', async (socket) => {
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
