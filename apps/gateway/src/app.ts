import { ApiError, globalErrorHandler } from '@server/middlewares';
import { HttpStatusCode } from '@server/utils';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import proxy from 'express-http-proxy';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './configs/configs';

const app: Application = express();

// Dev logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.set('trust proxy', 1);
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new ApiError(
        'Too many requests, please try again later.',
        HttpStatusCode.TOO_MANY_REQUESTS
      )
    );
  },
});

app.use(limiter);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser(config.COOKIE_SECRET));

app.use(
  cors({
    origin: [
      config.WEB_CLIENT_URL,
      config.ADMIN_CLIENT_URL,
      config.AGENT_CLIENT_URL,
    ],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.get('/', async (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '🚀 Welcome to Gateway! Your API is running perfectly.',
    timestamp: new Date().toISOString(),

    client: {
      ip: req.ip,
    },
  });
});

app.use('/api/v1/auth', proxy(config.AUTH_GATEWAY));

app.all(/(.*)/, (req: Request, res: Response, next: NextFunction) => {
  return next(
    new ApiError(
      `Can't find ${req.originalUrl} on this server!`,
      HttpStatusCode.NOT_FOUND
    )
  );
});

app.use(globalErrorHandler);

export default app;
