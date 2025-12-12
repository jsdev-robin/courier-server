export interface ProcessEnv {
  // Server
  NODE_ENV: 'development' | 'production';
  AUTH_PORT: string;

  // Database
  DATABASE_ONLINE: string;
  DATABASE_PASSWORD_ONLINE: string;

  // Redis / Upstash
  NODE_REDIS_URL: string;
  NODE_REDIS_PORT: string;
  REDIS_URL: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;

  // Cloudinary
  CLOUD_NAME: string;
  CLOUD_API_KEY: string;
  CLOUD_API_SECRET: string;
  CLOUDINARY_URL: string;

  // Kafka
  KAFKA_BROKERS: string;
  KAFKA_USERNAME: string;
  KAFKA_PASSWORD: string;

  // IP Request
  IPINFO_KEY: string;

  // Secrets & Encryption
  COOKIE_SECRET: string;
  ACTIVATION_SECRET: string;
  CRYPTO_SECRET: string;
  HMAC_SECRET: string;
  EMAIL_CHANGE_SECRET: string;
  ALGORITHM: string;
  KEY_LENGTH: string;
  IV_LENGTH: string;

  // Auth Tokens
  ACCESS_TOKEN: string;
  REFRESH_TOKEN: string;
  PROTECT_TOKEN: string;

  // Email
  EMAIL_USERNAME: string;
  EMAIL_PASSWORD: string;
  EMAIL_HOST: string;
  EMAIL_PORT: string;
  EMAIL_FROM: string;

  // OAuth - Google
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // OAuth - GitHub
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;

  // OAuth - Facebook
  FACEBOOK_CLIENT_ID: string;
  FACEBOOK_CLIENT_SECRET: string;

  // OAuth - X
  CONSUMER_KEY: string;
  CONSUMER_SECRET: string;

  // OAuth - Discord
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;

  // Client URL
  WEB_CLIENT_URL: string;
  ADMIN_CLIENT_URL: string;
  AGENT_CLIENT_URL: string;

  // Passkeys
  RP_NAME: string;
  RP_ID: string;

  AUTH_SERVER_ORIGIN: string;

  GEMINI_KEY: string;
}
