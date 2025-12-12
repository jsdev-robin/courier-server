import { ApiError } from '@server/middlewares';
import { IUser, Role } from '@server/types';
import { HttpStatusCode } from '@server/utils';
import { CookieOptions, NextFunction, Response } from 'express';
import { Model } from 'mongoose';
import {
  ACCESS_COOKIE_EXP,
  COOKIE_ADMIN_ACCESS,
  COOKIE_ADMIN_PENDING_2FA,
  COOKIE_ADMIN_PROTECT,
  COOKIE_ADMIN_REFRESH,
  COOKIE_AGENT_ACCESS,
  COOKIE_AGENT_PENDING_2FA,
  COOKIE_AGENT_PROTECT,
  COOKIE_AGENT_REFRESH,
  COOKIE_FINANCE_ACCESS,
  COOKIE_FINANCE_PENDING_2FA,
  COOKIE_FINANCE_PROTECT,
  COOKIE_FINANCE_REFRESH,
  COOKIE_MARKETING_ACCESS,
  COOKIE_MARKETING_PENDING_2FA,
  COOKIE_MARKETING_PROTECT,
  COOKIE_MARKETING_REFRESH,
  COOKIE_OPERATIONS_ACCESS,
  COOKIE_OPERATIONS_PENDING_2FA,
  COOKIE_OPERATIONS_PROTECT,
  COOKIE_OPERATIONS_REFRESH,
  COOKIE_OPTIONS_HTTP,
  COOKIE_OPTIONS_NOT_HTTP,
  COOKIE_SUPERADMIN_ACCESS,
  COOKIE_SUPERADMIN_PENDING_2FA,
  COOKIE_SUPERADMIN_PROTECT,
  COOKIE_SUPERADMIN_REFRESH,
  COOKIE_SUPPORT_ACCESS,
  COOKIE_SUPPORT_PENDING_2FA,
  COOKIE_SUPPORT_PROTECT,
  COOKIE_SUPPORT_REFRESH,
  COOKIE_USER_ACCESS,
  COOKIE_USER_PENDING_2FA,
  COOKIE_USER_PROTECT,
  COOKIE_USER_REFRESH,
  PROTECT_COOKIE_EXP,
  REFRESH_COOKIE_EXP,
} from './constants.js';

export class CookieService {
  protected readonly role: Role;
  protected readonly model?: Model<IUser>;

  constructor(options: { model?: Model<IUser>; role: Role }) {
    this.role = options.role;
    this.model = options.model;
  }

  protected getCookieNames() {
    return {
      access:
        this.role === 'user'
          ? COOKIE_USER_ACCESS
          : this.role === 'agent'
          ? COOKIE_AGENT_ACCESS
          : this.role === 'superadmin'
          ? COOKIE_SUPERADMIN_ACCESS
          : this.role === 'admin'
          ? COOKIE_ADMIN_ACCESS
          : this.role === 'support'
          ? COOKIE_SUPPORT_ACCESS
          : this.role === 'operations'
          ? COOKIE_OPERATIONS_ACCESS
          : this.role === 'finance'
          ? COOKIE_FINANCE_ACCESS
          : this.role === 'marketing'
          ? COOKIE_MARKETING_ACCESS
          : 'A1',

      refresh:
        this.role === 'user'
          ? COOKIE_USER_REFRESH
          : this.role === 'agent'
          ? COOKIE_AGENT_REFRESH
          : this.role === 'superadmin'
          ? COOKIE_SUPERADMIN_REFRESH
          : this.role === 'admin'
          ? COOKIE_ADMIN_REFRESH
          : this.role === 'support'
          ? COOKIE_SUPPORT_REFRESH
          : this.role === 'operations'
          ? COOKIE_OPERATIONS_REFRESH
          : this.role === 'finance'
          ? COOKIE_FINANCE_REFRESH
          : this.role === 'marketing'
          ? COOKIE_MARKETING_REFRESH
          : 'A2',

      protect:
        this.role === 'user'
          ? COOKIE_USER_PROTECT
          : this.role === 'agent'
          ? COOKIE_AGENT_PROTECT
          : this.role === 'superadmin'
          ? COOKIE_SUPERADMIN_PROTECT
          : this.role === 'admin'
          ? COOKIE_ADMIN_PROTECT
          : this.role === 'support'
          ? COOKIE_SUPPORT_PROTECT
          : this.role === 'operations'
          ? COOKIE_OPERATIONS_PROTECT
          : this.role === 'finance'
          ? COOKIE_FINANCE_PROTECT
          : this.role === 'marketing'
          ? COOKIE_MARKETING_PROTECT
          : 'A3',

      pending2FA:
        this.role === 'user'
          ? COOKIE_USER_PENDING_2FA
          : this.role === 'agent'
          ? COOKIE_AGENT_PENDING_2FA
          : this.role === 'superadmin'
          ? COOKIE_SUPERADMIN_PENDING_2FA
          : this.role === 'admin'
          ? COOKIE_ADMIN_PENDING_2FA
          : this.role === 'support'
          ? COOKIE_SUPPORT_PENDING_2FA
          : this.role === 'operations'
          ? COOKIE_OPERATIONS_PENDING_2FA
          : this.role === 'finance'
          ? COOKIE_FINANCE_PENDING_2FA
          : this.role === 'marketing'
          ? COOKIE_MARKETING_PENDING_2FA
          : 'A4',
    };
  }

  private getCookieConfig(
    type: 'access' | 'refresh' | 'protect' | 'pending2FA'
  ) {
    return {
      name: this.getCookieNames()[type],
      expires:
        type === 'access'
          ? ACCESS_COOKIE_EXP
          : type === 'refresh'
          ? REFRESH_COOKIE_EXP
          : type === 'pending2FA'
          ? {}
          : PROTECT_COOKIE_EXP,
      options:
        type === 'protect' ? COOKIE_OPTIONS_NOT_HTTP : COOKIE_OPTIONS_HTTP,
      signed: type === 'access' ? true : false,
    };
  }

  protected createCookie = (
    type: 'access' | 'refresh' | 'protect' | 'pending2FA',
    payload = '',
    remember = false
  ): [string, string, CookieOptions] => {
    try {
      const base = this.getCookieConfig(type);

      const options = remember
        ? {
            ...base.options,
            ...base.expires,
            signed: type === 'access' ? true : false,
          }
        : { ...base.options, signed: type === 'access' ? true : false };

      return [base.name, payload, options];
    } catch {
      throw new ApiError(
        'Failed to create access cookie.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected clearCookie = (
    res: Response,
    type: 'access' | 'refresh' | 'protect' | 'pending2FA'
  ) => {
    const config = this.getCookieConfig(type);
    res.clearCookie(config.name, config.options);
  };

  protected clearAllCookies = (res: Response) => {
    ['access', 'refresh', 'protect', 'enable2FA'].forEach((type) =>
      this.clearCookie(
        res,
        type as 'access' | 'refresh' | 'protect' | 'pending2FA'
      )
    );
  };

  protected sessionUnauthorized = (res: Response, next: NextFunction) => {
    this.clearAllCookies(res);
    return next(
      new ApiError(
        'Your session has expired or is no longer available. Please log in again to continue.',
        HttpStatusCode.UNAUTHORIZED
      )
    );
  };

  public get cookieToolkit() {
    return {
      getCookieNames: this.getCookieNames.bind(this),
      getCookieConfig: this.getCookieConfig.bind(this),
      createCookie: this.createCookie.bind(this),
      clearCookie: this.clearCookie.bind(this),
      clearAllCookies: this.clearAllCookies.bind(this),
      sessionUnauthorized: this.sessionUnauthorized.bind(this),
    };
  }
}
