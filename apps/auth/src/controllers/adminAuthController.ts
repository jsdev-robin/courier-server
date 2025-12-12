import { Protect } from '@server/protect';
import { TeamMember } from '../models/users/teamMemberModel';
import { AuthService } from '../services/auth/AuthServices';

export const adminAuthController = new AuthService({
  model: TeamMember,
  role: 'admin',
});

export const adminProtect = new Protect({
  role: 'admin',
});
