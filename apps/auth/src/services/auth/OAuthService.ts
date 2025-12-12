import { ApiError } from '@server/middlewares';
import { IUser, Role } from '@server/types';
import { catchAsync, HttpStatusCode } from '@server/utils';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { isValidObjectId, Model } from 'mongoose';
import { Profile as DiscordProfile } from 'passport-discord';
import { Profile as FacebookProfile } from 'passport-facebook';
import { Profile as GoogleProfile } from 'passport-google-oauth20';
import { Profile as TwitterProfile } from 'passport-twitter';
import { config } from '../../configs/configs';
import { GitHubProfileJson } from '../../middleware/passport/types/profile';
import { Agent } from '../../models/users/agentModel';
import { Buyer } from '../../models/users/buyerModel';
import { TeamMember } from '../../models/users/teamMemberModel';
import { AuthEngine } from './engine/AuthEngine';

const normalizeMail = (email?: string | null): string | undefined => {
  if (!email) return undefined;
  const [localPart, domain] = email.split('@');

  if (domain.toLowerCase() === 'gmail.com') {
    return localPart.replace(/\./g, '') + '@gmail.com';
  }

  return email.toLowerCase();
};

export class OAuthService {
  private oauth = async <T>(
    req: Request & {
      role?: Role;
    },
    res: Response,
    next: NextFunction,
    provider: string,
    options: {
      profileExtractor: (profile: T) => {
        email?: string;
        verified?: boolean;
        familyName?: string;
        givenName?: string;
        avatarUrl?: string;
      };
    }
  ): Promise<void> => {
    const role = req.session.role as Role;
    const profile = req.user as T;
    const { email, verified, familyName, givenName, avatarUrl } =
      options.profileExtractor(profile);
    const userId = req.session._id;

    const Model: Model<IUser> =
      role === 'buyer' ? Buyer : role === 'admin' ? TeamMember : Agent;

    const engine = new AuthEngine({
      model: Model,
      role: role,
    });

    if (userId && isValidObjectId(userId)) {
      const user = await Model.findById(userId);

      if (!user) {
        return next(
          new ApiError('User account not found', HttpStatusCode.NOT_FOUND)
        );
      }

      const providerExists = user.authentication.oauth?.some(
        (entry) => entry.provider === provider
      );

      if (!providerExists) {
        await Model.findByIdAndUpdate(
          { _id: userId },
          {
            $push: {
              'authentication.oauth': {
                provider: provider,
                email: email,
                _raw: req.user,
              },
            },
          },
          { new: true }
        );
      }

      const self = await Model.findById(userId).exec();

      if (!self) {
        return next(
          new ApiError(
            'User account not found or could not be retrieved. Please try signing in again.',
            HttpStatusCode.INTERNAL_SERVER_ERROR
          )
        );
      }

      await engine.engineToolkit.setCacheUser(self);

      res.redirect(
        role === 'buyer'
          ? config.WEB_CLIENT_URL
          : `${config.AGENT_CLIENT_URL}/account/dashboard/settings/security?provider=${provider}&success=true`
      );
    } else {
      const userExists = await Model.findOne({
        'personalInfo.email': email,
      }).exec();

      if (userExists) {
        const providerExists = userExists.authentication.oauth?.some(
          (entry) => entry.provider === provider
        );

        if (!providerExists) {
          await Model.findByIdAndUpdate(
            { _id: userExists._id },
            {
              $push: {
                'authentication.oauth': {
                  provider: provider,
                  email: email,
                  _raw: req.user,
                },
              },
            },
            { new: true }
          );
        }

        const self = await Model.findById(userExists._id).exec();

        if (!self) {
          return next(
            new ApiError(
              'User account not found or could not be retrieved. Please try signing in again.',
              HttpStatusCode.BAD_REQUEST
            )
          );
        }

        req.self = self;
        req.role = role;
        return next();
      }

      const self = await Model.create({
        'personalInfo.familyName': familyName,
        'personalInfo.givenName': givenName,
        'personalInfo.email': email,
        'personalInfo.avatar.url': avatarUrl,
        'authentication.isVerified': verified,
        'authentication.oauth': [
          { provider: provider, email: email, _raw: req.user },
        ],
      });

      req.self = self;
      req.role = role;

      next();
    }
  };

  public createSession: RequestHandler = catchAsync(
    async (
      req: Request & {
        role?: Role;
      },
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const user = req.self;
      const role = req.role ?? 'buyer';
      const model = role === 'buyer' ? Buyer : Agent;
      const engine = new AuthEngine({
        model: model,
        role: role,
      });

      const [accessToken, refreshToken, protectToken] =
        engine.tokenToolkit.rotateToken(req, {
          id: user.id,
          role: user.role,
          remember: true,
        });

      res.cookie(
        ...engine.cookieToolkit.createCookie('access', accessToken, true)
      );
      res.cookie(
        ...engine.cookieToolkit.createCookie('refresh', refreshToken, true)
      );
      res.cookie(
        ...engine.cookieToolkit.createCookie('protect', protectToken, true)
      );

      await engine.engineToolkit.storeSession(req, { user, accessToken });

      try {
        res.redirect(
          role === 'buyer'
            ? config.WEB_CLIENT_URL
            : `${config.AGENT_CLIENT_URL}/account/dashboard/overview?provider=google&success=true`
        );
      } catch (error) {
        if (!res.headersSent) {
          engine.cookieToolkit.clearAllCookies(res);
        }
        next(error);
      }
    }
  );

  public googleAuth: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      await this.oauth<GoogleProfile>(req, res, next, 'google', {
        profileExtractor: (profile) => ({
          email: normalizeMail(profile._json?.email),
          verified: profile._json?.email_verified,
          familyName: profile._json?.given_name,
          givenName: profile._json?.family_name,
          avatarUrl: profile._json.picture,
        }),
      });
    }
  );

  public githubAuth: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      await this.oauth<{ _json: GitHubProfileJson }>(req, res, next, 'github', {
        profileExtractor: (profile) => ({
          email: normalizeMail(profile._json?.email),
          verified: true,
          familyName: profile._json?.name?.split(' ')[0],
          givenName: profile._json?.name?.split(' ')[1],
          avatarUrl: profile._json.avatar_url,
        }),
      });
    }
  );

  public twitterAuth: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      await this.oauth<TwitterProfile>(req, res, next, 'twitter', {
        profileExtractor: (profile) => ({
          email: normalizeMail(profile._json?.email),
          verified: true,
          familyName: profile._json?.name?.split(' ')[0],
          givenName: profile._json?.name?.split(' ')[1],
          avatarUrl: profile._json.profile_image_url,
        }),
      });
    }
  );

  public facebookAuth: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      await this.oauth<FacebookProfile>(req, res, next, 'facebook', {
        profileExtractor: (profile) => ({
          email: normalizeMail(profile._json?.email || profile._json.id),
          verified: true,
          familyName: profile._json?.name?.split(' ')[0],
          givenName: profile._json?.name?.split(' ')[1],
          avatarUrl: profile._json.picture?.data?.url,
        }),
      });
    }
  );

  public discordAuth: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      await this.oauth<DiscordProfile>(req, res, next, 'discord', {
        profileExtractor: (profile) => ({
          email: normalizeMail(profile.email),
          verified: profile.verified,
          familyName: profile.global_name?.split(' ')[0],
          givenName: profile.global_name?.split(' ')[1],
          avatarUrl: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
        }),
      });
    }
  );

  public get oauthToolkit(): {
    oauth: <T>(
      req: Request & { role?: Role },
      res: Response,
      next: NextFunction,
      provider: string,
      options: {
        profileExtractor: (profile: T) => {
          email?: string;
          verified?: boolean;
          familyName?: string;
          givenName?: string;
          avatarUrl?: string;
        };
      }
    ) => Promise<void>;
    createSession: RequestHandler;
    googleAuth: RequestHandler;
    githubAuth: RequestHandler;
    twitterAuth: RequestHandler;
    facebookAuth: RequestHandler;
    discordAuth: RequestHandler;
  } {
    return {
      oauth: this.oauth.bind(this),
      createSession: this.createSession.bind(this),
      googleAuth: this.googleAuth.bind(this),
      githubAuth: this.githubAuth.bind(this),
      twitterAuth: this.twitterAuth.bind(this),
      facebookAuth: this.facebookAuth.bind(this),
      discordAuth: this.discordAuth.bind(this),
    };
  }
}
