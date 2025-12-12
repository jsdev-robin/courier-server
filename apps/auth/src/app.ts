import { nodeClient } from '@server/cloud';
import { ApiError, globalErrorHandler } from '@server/middlewares';
import { HttpStatusCode } from '@server/utils';
import bodyParser from 'body-parser';
import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import useragent from 'express-useragent';
import ipinfo, { defaultIPSelector } from 'ipinfo-express';
import morgan from 'morgan';
import os from 'os';
import passport from 'passport';
import { config } from './configs/configs';
import { initializePassport } from './middleware/passport/passport';
import adminRouter from './routes/adminRoutes';
import sellerRouter from './routes/agentRoutes';
import oauthRouter from './routes/oauthRoutes';

const app: Application = express();

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Proxy middleware
app.set('trust proxy', 1);

const redisStore = new RedisStore({
  client: nodeClient,
  prefix: 'devmun:',
  ttl: 5 * 60,
});

app.use(
  session({
    store: redisStore,
    secret: 'your-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 5 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

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

// Initialize Passport
initializePassport();
app.use(passport.initialize());
app.use(passport.session());

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user: Express.User, done) => {
  done(null, user);
});

// Parse request bodies
app.use(bodyParser.json({ limit: '50kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50kb' }));

// Parse cookies
app.use(cookieParser(config.COOKIE_SECRET));

// Get req  location
app.use(
  ipinfo({
    token: config.IPINFO_KEY,
    cache: null,
    timeout: 5000,
    ipSelector: defaultIPSelector,
  })
);

// Configure Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: [
      config.WEB_CLIENT_URL,
      config.AGENT_CLIENT_URL,
      config.ADMIN_CLIENT_URL,
    ],
    allowedHeaders: ['Content-Type', 'Authorization', 'Auth'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Get user device info
app.use(useragent.express());

// Convert bytes → MB → GB
const formatMemory = (bytes: number) => {
  const mb = bytes / (1024 * 1024);
  const gb = bytes / (1024 * 1024 * 1024);
  return {
    bytes,
    mb: Number(mb.toFixed(2)),
    gb: Number(gb.toFixed(2)),
  };
};

app.get('/', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuInfo = os.cpus();
  const totalRAM = os.totalmem();
  const freeRAM = os.freemem();

  res.status(200).json({
    status: 'success',
    message: '🚀 Welcome to Auth! Your API is running perfectly.',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),

    environment: config.NODE_ENV,
    version: '1.0.0',

    system: {
      ram: {
        total: formatMemory(totalRAM),
        free: formatMemory(freeRAM),
        used: formatMemory(totalRAM - freeRAM),
      },

      memoryUsage: {
        rss: formatMemory(memoryUsage.rss),
        heapTotal: formatMemory(memoryUsage.heapTotal),
        heapUsed: formatMemory(memoryUsage.heapUsed),
        external: formatMemory(memoryUsage.external),
      },

      cpu: {
        cores: cpuInfo.length,
        model: cpuInfo[0]?.model,
        speedMHz: cpuInfo[0]?.speed,
      },
    },

    client: {
      ip: req.ip,
      userAgent: req.useragent,
    },
  });
});

// All route
app.use('/admin', adminRouter);
app.use('/agent', sellerRouter);
app.use('/oauth', oauthRouter);

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
