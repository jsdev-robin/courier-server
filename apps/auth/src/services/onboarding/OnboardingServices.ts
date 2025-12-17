import { nodeClient } from '@server/cloud';
import { SendEmail } from '@server/emails';
import { ApiError } from '@server/middlewares';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { config } from '../../configs/configs';
import { Agent } from '../../models/users/agentModel';

export class OnboardingServices {
  public static invite: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { email } = req.body;

      const userExists = await Agent?.findOne({
        $or: [
          { 'personalInfo.email': email },
          { 'authentication.oauth.email': email },
        ],
      })
        .lean()
        .exec();

      if (userExists) {
        return next(
          new ApiError(
            'This email is already registered. Use a different email address.',
            HttpStatusCode.BAD_REQUEST
          )
        );
      }

      const mailData = {
        user: {
          email,
        },
        origin: config.ISPRODUCTION
          ? 'https://www.devmun.xyz/agent/create'
          : 'http://localhost:3000/agent/create',
      };

      await new SendEmail(mailData)
        .agentInvite()
        .then(async () => {
          await nodeClient.set(`agent:invite:${email}`, 'invited', {
            EX: 60 * 60 * 24 * 3,
          });
          res.status(HttpStatusCode.OK).json({
            status: Status.SUCCESS,
            message: 'Your invitation send successfully',
          });
        })
        .catch(() => {
          return next(
            new ApiError(
              'An error occurred while sending the verification email. Please try again later.',
              HttpStatusCode.INTERNAL_SERVER_ERROR
            )
          );
        });
    }
  );

  public static checkInvited: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { email } = req.body;

      const normalizedEmail = email.toLowerCase().trim();
      const key = `agent:invite:${normalizedEmail}`;

      const invited = await nodeClient.get(key);

      if (!invited) {
        return next(
          new ApiError(
            'You are not invited to register.',
            HttpStatusCode.FORBIDDEN
          )
        );
      }

      next();
    }
  );
}
