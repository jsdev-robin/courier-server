import dotenv from 'dotenv';
import { ProcessEnv } from './types/index.js';

dotenv.config({
  path: './.env',
  quiet: true,
  debug: process.env.DEBUG === 'true',
});

const requiredVars: Array<keyof ProcessEnv> = [
  'NODE_ENV',
  'GATEWAY_PORT',
  'AUTH_PORT',
  'COOKIE_SECRET',
  'WEB_CLIENT_URL',
  'ADMIN_CLIENT_URL',
  'AUTH_GATEWAY',
];

function validateEnv(env: ProcessEnv) {
  const missing = requiredVars.filter(
    (key) => !env[key] || env[key].trim() === ''
  );
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const env = process.env as unknown as ProcessEnv;
validateEnv(env);

const defaults: Partial<ProcessEnv> = {
  NODE_ENV: 'development',
  GATEWAY_PORT: '8001',
  AUTH_PORT: '8002',
};

const config: ProcessEnv & { ISPRODUCTION: boolean } = {
  ...defaults,
  ...env,
  ISPRODUCTION: env.NODE_ENV === 'production',
};

export { config };
