import { IUser } from '@server/types';
import 'express';

declare global {
  namespace Express {
    interface Request {
      self: IUser;
    }
  }
}
