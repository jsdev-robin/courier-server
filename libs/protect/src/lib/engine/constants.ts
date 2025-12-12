import { CookieOptions } from 'express';

export const ACCESS_TTL: number = 30;
export const REFRESH_TTL: number = 3;
export const PROTECT_TTL: number = 3;

// 30 min
export const ACCESS_COOKIE_EXP = {
  expires: new Date(Date.now() + ACCESS_TTL * 60 * 1000),
  maxAge: ACCESS_TTL * 60 * 1000,
};

// 3 days
export const REFRESH_COOKIE_EXP = {
  expires: new Date(Date.now() + REFRESH_TTL * 24 * 60 * 60 * 1000),
  maxAge: REFRESH_TTL * 24 * 60 * 60 * 1000,
};

export const PROTECT_COOKIE_EXP = {
  expires: new Date(Date.now() + PROTECT_TTL * 24 * 60 * 60 * 1000),
  maxAge: PROTECT_TTL * 24 * 60 * 60 * 1000,
};

export const ENABLE2FA_COOKIE_EXP = {
  expires: new Date(Date.now() + 5 * 60 * 1000),
  maxAge: 5 * 60 * 1000,
};

export const ENABLE_SIGNATURE = {
  signed: true,
};

export const COOKIE_OPTIONS_HTTP: CookieOptions = {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  path: '/',
  domain: '.devmun.xyz',
};

export const COOKIE_OPTIONS_NOT_HTTP: CookieOptions = {
  httpOnly: true,
  sameSite: 'none',
  secure: true,
  path: '/',
  domain: '.devmun.xyz',
};

// Superadmin cookies
export const COOKIE_SUPERADMIN_ACCESS = 'xsa1fe7';
export const COOKIE_SUPERADMIN_REFRESH = 'xsa2be3';
export const COOKIE_SUPERADMIN_PROTECT = 'xsa3cd4';
export const COOKIE_SUPERADMIN_PENDING_2FA = 'xsa3cd5';

// Admin cookies
export const COOKIE_ADMIN_ACCESS = 'xad1fe7';
export const COOKIE_ADMIN_REFRESH = 'xad2be3';
export const COOKIE_ADMIN_PROTECT = 'xad3cd4';
export const COOKIE_ADMIN_PENDING_2FA = 'xad3cd5';

// Support cookies
export const COOKIE_SUPPORT_ACCESS = 'xsu1fe7';
export const COOKIE_SUPPORT_REFRESH = 'xsu2be3';
export const COOKIE_SUPPORT_PROTECT = 'xsu3cd4';
export const COOKIE_SUPPORT_PENDING_2FA = 'xsu3cd5';

// Operations cookies
export const COOKIE_OPERATIONS_ACCESS = 'xop1fe7';
export const COOKIE_OPERATIONS_REFRESH = 'xop2be3';
export const COOKIE_OPERATIONS_PROTECT = 'xop3cd4';
export const COOKIE_OPERATIONS_PENDING_2FA = 'xop3cd5';

// Finance cookies
export const COOKIE_FINANCE_ACCESS = 'xfi1fe7';
export const COOKIE_FINANCE_REFRESH = 'xfi2be3';
export const COOKIE_FINANCE_PROTECT = 'xfi3cd4';
export const COOKIE_FINANCE_PENDING_2FA = 'xfi3cd5';

// Marketing cookies
export const COOKIE_MARKETING_ACCESS = 'xma1fe7';
export const COOKIE_MARKETING_REFRESH = 'xma2be3';
export const COOKIE_MARKETING_PROTECT = 'xma3cd4';
export const COOKIE_MARKETING_PENDING_2FA = 'xma3cd5';

// Seller cookies
export const COOKIE_AGENT_ACCESS = 'xa91fe7';
export const COOKIE_AGENT_REFRESH = 'xa92be3';
export const COOKIE_AGENT_PROTECT = 'xa93cd4';
export const COOKIE_AGENT_PENDING_2FA = 'xa93cd5';

// Buyer cookies
export const COOKIE_USER_ACCESS = 'xd91fe7';
export const COOKIE_USER_REFRESH = 'xd92be3';
export const COOKIE_USER_PROTECT = 'xd93cd4';
export const COOKIE_USER_PENDING_2FA = 'xd93cd5';
