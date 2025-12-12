import { nodeClient } from '@server/cloud';
import { ApiError } from '@server/middlewares';
import { Crypto } from '@server/security';
import { IUser, Role } from '@server/types';
import { catchAsync, HttpStatusCode } from '@server/utils';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { CookieService } from './engine/CookieService.js';

export class Protect extends CookieService {
  constructor(options: { model?: Model<IUser>; role: Role }) {
    super(options);
  }

  public validateToken: RequestHandler = catchAsync(
    async (
      req: Request<Record<string, string>, unknown> & {
        userId?: string | undefined;
        accessToken?: string | undefined;
      },
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const accessCookie = req.signedCookies[this.getCookieNames().access];

      // If the access token is missing, throw an unauthorized error
      if (accessCookie === false) {
        return next(
          new ApiError(
            'Your session has expired or is no longer available. Please log in again to continue.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      // Verify the access token and decode the payload
      const decoded = jwt.verify(
        accessCookie,
        process.env.ACCESS_TOKEN ?? ''
      ) as {
        id: string;
      };
      // Attach user ID and access token to the request object
      req.userId = decoded?.id;
      req.accessToken = accessCookie;

      next();
    }
  );

  public requireAuth: RequestHandler = catchAsync(
    async (
      req: Request<unknown, unknown, unknown> & {
        userId?: string | undefined;
        accessToken?: string | undefined;
      },
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // Get credentials from request
      const { userId, accessToken } = req;

      // Query session and user data from Redis
      const p = nodeClient.multi();
      p.SISMEMBER(
        `${this.role}/${userId}:session`,
        Crypto.hmac(String(accessToken), process.env.HMAC_SECRET ?? '')
      );
      p.json.GET(`${this.role}/${userId}`);

      const [sessionToken, user] = await p.exec();

      // Invalidate if session/user not found
      if (!sessionToken || !user) {
        return this.sessionUnauthorized(res, next);
      }

      req.self = user as unknown as IUser;

      next();
    }
  );

  public restrictTo = (...roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = req?.self;
      if (!user?.role || !roles.includes(user.role)) {
        this.clearAllCookies(res);

        return next(
          new ApiError(
            'You do not have permission to perform this action',
            HttpStatusCode.FORBIDDEN
          )
        );
      }

      next();
    };
  };
}
