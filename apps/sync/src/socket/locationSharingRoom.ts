import { Server } from 'socket.io';

export async function locationSharingRoom(io: Server) {
  const ns = io.of('/agent/sharing/location');

  ns.on('connection', async (socket) => {
    socket.on(
      'agentSharingLocation',
      async (data: {
        location: { longitude: number; latitude: number };
        speed: number;
        agent: {
          id: string;
          fullName?: string;
          email?: string;
          phone?: string;
          avatar: {
            url: string;
          };
        };
      }) => {
        if (data) {
          ns.to(data.agent.id).emit(data?.agent.id, data);
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
