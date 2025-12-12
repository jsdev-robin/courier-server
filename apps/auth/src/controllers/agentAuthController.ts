import { Protect } from '@server/protect';
import { Agent } from '../models/users/agentModel';
import { AuthService } from '../services/auth/AuthServices';

export const agentAuthController = new AuthService({
  model: Agent,
  role: 'agent',
});

export const protect = new Protect({
  role: 'agent',
});
