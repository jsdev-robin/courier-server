import { Protect } from '@server/protect';
import { User } from '../models/users/userModel';
import { AuthService } from '../services/auth/AuthServices';

export const userAuthController = new AuthService({
  model: User,
  role: 'user',
});

export const protect = new Protect({
  role: 'user',
});
