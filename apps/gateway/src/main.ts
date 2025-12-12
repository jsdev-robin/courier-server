import app from './app';
import { config } from './configs/configs';

app.listen(Number(config.GATEWAY_PORT), () => {
  console.log(
    `🚀 Gateway server is running on port ${config.GATEWAY_PORT} in ${config.NODE_ENV}`
  );
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ UNHANDLED PROMISE REJECTION 💥:', err.message);
  process.exit(1);
});
