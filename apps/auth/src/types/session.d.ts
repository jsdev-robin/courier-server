import { Role } from '@server/types';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    _id?: string;
    role?: Role;
  }
}
