import { nodeClient } from '@server/cloud';
import jwt, { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { config } from '../configs/configs';

function verifyToken(cookies: string | undefined) {
  try {
    const token =
      cookies
        ?.split('; ')
        .find((c) => c.startsWith('xa92be3='))
        ?.split('=')[1] ?? '';

    return jwt.verify(token, config.REFRESH_TOKEN) as JwtPayload & {
      id: string;
    };
  } catch {
    return null;
  }
}

export async function agentLiveLocation(io: Server) {
  const ns = io.of('/agent/location');

  ns.on('connection', async (socket) => {
    const decoded = verifyToken(socket.handshake.headers.cookie);
    const agentsCollection = await mongoose.connection.collection('agents');

    if (!decoded || !decoded.id) {
      socket.disconnect(true);
      return;
    }

    socket.on(
      'agentLiveLocation',
      async (data: { longitude: number; latitude: number }) => {
        if (data) {
          socket.emit(decoded?.id, data);

          await nodeClient.geoAdd(`agent/location`, {
            longitude: data.longitude,
            latitude: data.latitude,
            member: decoded?.id,
          });

          await agentsCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(decoded.id) },
            {
              $set: {
                location: {
                  coordinates: [data.longitude, data.latitude],
                },
              },
            }
          );
        }
      }
    );
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
