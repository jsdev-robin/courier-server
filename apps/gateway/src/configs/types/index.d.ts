export interface ProcessEnv {
  // Server
  NODE_ENV: 'development' | 'production';
  GATEWAY_PORT: string;
  AUTH_GATEWAY: string;
  PARCEL_GATEWAY: string;
  RESOURCES_GATEWAY: string;

  COOKIE_SECRET: string;

  // Client URL
  WEB_CLIENT_URL: string;
  ADMIN_CLIENT_URL: string;
  AGENT_CLIENT_URL: string;
}
