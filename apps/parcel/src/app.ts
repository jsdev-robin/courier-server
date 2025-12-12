import { ApiError, globalErrorHandler } from '@server/middlewares';
import { HttpStatusCode } from '@server/utils';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { config } from './configs/configs';
import customerRouter from './routes/customerRoutes';

const app: Application = express();

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Proxy middleware
app.set('trust proxy', 1);

// Parse request bodies
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

// Parse cookies
app.use(cookieParser(config.COOKIE_SECRET));

// Configure Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: [
      config.WEB_CLIENT_URL,
      config.AGENT_CLIENT_URL,
      config.ADMIN_CLIENT_URL,
    ],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.get('/', async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '🚀 Welcome to Parcel! Your API is running perfectly.',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    environment: config.NODE_ENV,
    version: '1.0.0',
  });
});

app.use('/customer', customerRouter);

// Handle 404 errors
app.all(/(.*)/, (req: Request, res: Response, next: NextFunction) => {
  return next(
    new ApiError(
      `Can't find ${req.originalUrl} on this server!`,
      HttpStatusCode.NOT_FOUND
    )
  );
});

// Global error handling middleware
app.use(globalErrorHandler);

export default app;
