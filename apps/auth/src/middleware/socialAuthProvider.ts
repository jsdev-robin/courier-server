import { Role } from '@server/types';
import { NextFunction, Request, Response } from 'express';
import passport from 'passport';

export const socialAuthProvider =
  (provider: string, role: Role, _id?: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    req.session.role = role;
    req.session._id = _id;
    passport.authenticate(provider)(req, res, next);
  };
