import { ApiError } from '@server/middlewares';
import {
  ACCESS_TTL,
  CookieService,
  PROTECT_TTL,
  REFRESH_TTL,
} from '@server/protect';
import { Crypto } from '@server/security';
import { Role } from '@server/types';
import { HttpStatusCode } from '@server/utils';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../configs/configs';

export interface TokenSignature {
  ip: string;
  browser: string;
  device: string;
  id: string;
  role: Role;
  remember: boolean;
  token: string;
}

export class TokenService extends CookieService {
  private tokenSignature(req: Request, user: { id: string; role: Role }) {
    // Generate a hashed token signature based on request and user info
    return {
      ip: Crypto.hmac(String(req.ip), config.HMAC_SECRET),
      id: user.id,
      role: user.role,
      browser: Crypto.hmac(String(req.useragent?.browser), config.HMAC_SECRET),
      device: Crypto.hmac(String(req.useragent?.os), config.HMAC_SECRET),
    };
  }

  protected checkTokenSignature(
    decoded: TokenSignature | null,
    req: Request
  ): boolean {
    if (!decoded) return true;

    // Safe string comparison using crypto.timingSafeEqual
    const compare = (a: string, b: string): boolean => {
      const aBuf: Buffer = Buffer.from(a);
      const bBuf: Buffer = Buffer.from(b);

      if (aBuf.length !== bBuf.length) return false;
      return timingSafeEqual(
        aBuf as unknown as Uint8Array,
        bBuf as unknown as Uint8Array
      );
    };

    // Return true if device or browser signature does not match
    return (
      !compare(
        decoded.device,
        Crypto.hmac(String(req.useragent?.os), config.HMAC_SECRET)
      ) ||
      !compare(
        decoded.browser,
        Crypto.hmac(String(req.useragent?.browser), config.HMAC_SECRET)
      )
    );
  }

  protected rotateToken = (
    req: Request,
    payload: { id: string; role: Role; remember: boolean }
  ): [string, string, string] => {
    try {
      const { id, role, remember } = payload;

      // Generate a hashed signature for the client
      const clientSignature = this.tokenSignature(req, {
        id: id,
        role: role,
      });

      // Create an access token with a short TTL
      const accessToken = jwt.sign(
        { ...clientSignature },
        config.ACCESS_TOKEN,
        {
          expiresIn: `${ACCESS_TTL}m`,
          algorithm: 'HS256',
        }
      );

      const refreshToken = jwt.sign(
        {
          ...clientSignature,
          remember: remember,
          token: Crypto.hmac(accessToken, config.HMAC_SECRET),
        },
        config.REFRESH_TOKEN,
        {
          expiresIn: `${REFRESH_TTL}d`,
          algorithm: 'HS256',
        }
      );

      const protectToken = jwt.sign(
        {
          ...clientSignature,
          remember: remember,
          token: Crypto.hmac(accessToken, config.HMAC_SECRET),
        },
        config.PROTECT_TOKEN,
        {
          expiresIn: `${PROTECT_TTL}d`,
          algorithm: 'HS256',
        }
      );

      // Return all three tokens
      return [accessToken, refreshToken, protectToken];
    } catch {
      // Throw error if token generation fails
      throw new ApiError(
        'Failed to generate session tokens. Please try again.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  public get tokenToolkit() {
    return {
      tokenSignature: this.tokenSignature.bind(this),
      checkTokenSignature: this.checkTokenSignature.bind(this),
      rotateToken: this.rotateToken.bind(this),
    };
  }
}
