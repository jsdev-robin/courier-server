import { nodeClient } from '@server/cloud';
import { Server } from 'socket.io';

export async function streamAgentLocation(io: Server) {
  const ns = io.of('/agent/stream/location');

  ns.on('connection', async (socket) => {
    socket.on(
      'agentLocationStream',
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
          await nodeClient.hSet(
            'agents:locations',
            data.agent.id,
            JSON.stringify(data)
          );

          const all = await nodeClient.hGetAll('agents:locations');

          ns.emit(
            'allAgents',
            Object.values(all).map((v) => JSON.parse(v)) ?? []
          );
        }
      }
    );

    socket.on('disconnect', () => {});
  });
}
