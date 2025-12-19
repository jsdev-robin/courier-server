import { Server } from 'socket.io';

export async function streamAgentLocation(io: Server) {
  const nameSpace = io.of('/agent/stream/location');

  nameSpace.on('connection', async (socket) => {
    socket.on(
      'agentLocationStream',
      async (data: {
        position: { lat: number; lng: number };
        speed: number;
        member: string;
      }) => {
        if (data) {
          nameSpace.to(data.member).emit(data?.member, data);
        }
      }
    );

    socket.on('joinAgentRoom', (agentId: string) => {
      socket.join(agentId);
    });

    socket.on('joinAdminRoom', (agentId: string) => {
      socket.join(agentId);
    });

    socket.on('disconnect', () => {});
  });
}
