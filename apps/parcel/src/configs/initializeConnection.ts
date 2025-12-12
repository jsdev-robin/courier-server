import { db, nodeClient, upstashClient } from '@server/cloud';
import { config } from './configs';

// Initialize MongoDB connection
async function initializeMongoDB() {
  try {
    await db(config.DB);
    console.log('✅ Connected to MongoDB 🍃');
  } catch (error) {
    console.error('❌ MongoDB 🍃 Connection Error:', (error as Error).message);
    process.exit(1);
  }
}

// Initialize Redis connections
async function initializeRedis() {
  // Node Redis
  const nodeRedis = await nodeClient.connect();
  console.log('✅ Node Redis 🔗 Client Connection Successful', nodeRedis);

  // Io Redis
  const upstashRedis = await upstashClient.ping();
  console.log('✅ Upstash Redis 🛠️  Connection Successful:', upstashRedis);
}

export { initializeMongoDB, initializeRedis };
