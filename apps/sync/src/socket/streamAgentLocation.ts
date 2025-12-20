import { nodeClient } from '@server/cloud';
import { Server } from 'socket.io';

export async function streamAgentLocation(io: Server) {
  const ns = io.of('/agent/stream/location');
  const redisSubscriber = nodeClient.duplicate();
  await redisSubscriber.connect();

  ns.on('connection', async (socket) => {
    socket.on(
      'agentLocationStream',
      async (data: {
        position: { lat: number; lng: number };
        speed: number;
        member: string;
      }) => {
        if (data) {
          await nodeClient.hSet(
            'agents:locations',
            data.member,
            JSON.stringify(data)
          );

          const all = await nodeClient.hGetAll('agents:locations');

          console.log(Object.values(all).map((v) => JSON.parse(v)));

          ns.emit(
            'allAgents',
            Object.values(all).map((v) => JSON.parse(v))
          );

          ns.to(data.member).emit(data?.member, data);
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
