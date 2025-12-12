import { Protect } from '@server/protect';

export const adminProtect = new Protect({
  role: 'admin',
});

export const agentProtect = new Protect({
  role: 'agent',
});

export const userProtect = new Protect({
  role: 'user',
});
