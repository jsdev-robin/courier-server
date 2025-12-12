import express, { NextFunction, Request, Response, Router } from 'express';
import passport from 'passport';
import { oauthController } from '../controllers/oauthController';

interface OAuthRequest extends Request {
  user?: Express.User;
}

const router: Router = express.Router();

const oauthProviders: {
  strategy: string;
  controllerMethod: (
    req: OAuthRequest,
    res: Response,
    next: NextFunction
  ) => void;
}[] = [
  { strategy: 'google', controllerMethod: oauthController.googleAuth },
  { strategy: 'github', controllerMethod: oauthController.githubAuth },
  { strategy: 'facebook', controllerMethod: oauthController.facebookAuth },
  { strategy: 'twitter', controllerMethod: oauthController.twitterAuth },
  { strategy: 'discord', controllerMethod: oauthController.discordAuth },
];

oauthProviders.forEach(({ strategy, controllerMethod }) => {
  router.get(
    `/${strategy}/callback`,
    (req: OAuthRequest, res: Response, next: NextFunction) => {
      passport.authenticate(
        strategy,
        { session: false },
        (err: Error, user: Express.User, info: unknown) => {
          if (err || !user) {
            res
              .status(401)
              .json({ message: 'OAuth login failed', error: err, info });
            return;
          }
          req.user = user;
          next();
        }
      )(req, res, next);
    },
    controllerMethod,
    oauthController.createSession
  );
});

export default router;
