import { nodeClient } from '@server/cloud';
import { ApiError } from '@server/middlewares';
import { ACCESS_TTL, REFRESH_TTL } from '@server/protect';
import { Crypto, Decipheriv } from '@server/security';
import { IUser } from '@server/types';
import { HttpStatusCode } from '@server/utils';
import { randomBytes, randomInt } from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../configs/configs';
import { Passkeys } from '../../../models/passkeys/passkeyModel';
import { TokenService } from './TokenService';

export class AuthEngine extends TokenService {
  protected getDeviceInfo = (req: Request) => {
    // Get the user agent object from the request (requires useragent middleware)
    const ua = req.useragent;

    // Determine the device type based on user agent flags
    const deviceType = ua?.isSmartTV
      ? 'smart-tv'
      : ua?.isBot
      ? 'bot'
      : ua?.isMobileNative
      ? 'mobile-native'
      : ua?.isMobile
      ? 'mobile'
      : ua?.isTablet
      ? 'tablet'
      : ua?.isAndroidTablet
      ? 'android-tablet'
      : ua?.isiPad
      ? 'ipad'
      : ua?.isiPhone
      ? 'iphone'
      : ua?.isiPod
      ? 'ipod'
      : ua?.isKindleFire
      ? 'kindle-fire'
      : ua?.isDesktop
      ? 'desktop'
      : ua?.isWindows
      ? 'windows'
      : ua?.isMac
      ? 'mac'
      : ua?.isLinux
      ? 'linux'
      : ua?.isChromeOS
      ? 'chromeos'
      : ua?.isRaspberry
      ? 'raspberry-pi'
      : 'unknown';

    return {
      deviceType,
      os: ua?.os ?? 'unknown',
      version: ua?.version ?? 'unknown',
      browser: ua?.browser ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
      ip: req.ip,
      date: Date.now(),
      ...this.getLocationInfo(req),
    };
  };

  protected getLocationInfo = (req: Request) => ({
    city: req.ipinfo?.city || 'unknown',
    country: req.ipinfo?.country || 'unknown',
    lat: Number(req.ipinfo?.loc?.split(',')[0]) || 0,
    lng: Number(req.ipinfo?.loc?.split(',')[1]) || 0,
  });

  protected creatOtp = async (
    req: Request,
    data: object
  ): Promise<{ token: string; solidOTP: number }> => {
    try {
      // Define minimum and maximum values for a 6-digit OTP
      const otpMin = Math.pow(10, 6 - 1);
      const otpMax = Math.pow(10, 6) - 1;

      // Generate a random 6-digit OTP
      const solidOTP = randomInt(otpMin, otpMax);

      // Encrypt the OTP along with additional data and client IP
      const encrypted = await Crypto.cipheriv(
        {
          ...data,
          solidOTP,
          ip: req.ip,
        },
        config.CRYPTO_SECRET
      );

      // Sign the encrypted data into a JWT token with 10 minutes expiry
      const token = jwt.sign({ encrypted }, config.ACTIVATION_SECRET, {
        expiresIn: '10m',
      });

      // Return both the JWT token and the plain OTP
      return { token, solidOTP };
    } catch {
      // Throw a generic internal server error if OTP creation fails
      throw new ApiError(
        'Failed to create OTP. Please try again.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected storeSession = async (
    req: Request,
    payload: {
      user: IUser;
      accessToken: string;
    }
  ): Promise<void> => {
    try {
      const { user, accessToken } = payload;
      const { _id } = user;

      // Hash the access token for secure storage
      const hashedToken = Crypto.hmac(String(accessToken), config.HMAC_SECRET);

      // Execute Redis and MongoDB updates in parallel
      await Promise.all([
        (async () => {
          // Create a Redis multi-command pipeline
          const p = nodeClient.multi();

          // Add the hashed token to the user's session set in Redis
          p.SADD(`${this.role}/${_id}:session`, hashedToken);

          // Store the user object as JSON in Redis
          p.json.SET(`${this.role}/${_id}`, '$', user.toObject());

          // Set expiration for the session set (access token TTL in seconds)
          p.EXPIRE(`${this.role}/${_id}:session`, ACCESS_TTL * 24 * 60 * 60);

          // Set expiration for the user object (refresh token TTL in seconds)
          p.EXPIRE(`${this.role}/${_id}`, REFRESH_TTL * 24 * 60 * 60);

          // Execute all Redis commands in the pipeline
          await p.exec();
        })(),

        // Update the MongoDB user document with session info
        this.model
          ?.findByIdAndUpdate(
            { _id: _id },
            {
              $push: {
                sessions: {
                  token: hashedToken,
                  deviceInfo: this.getDeviceInfo(req),
                  location: this.getLocationInfo(req),
                  ip: req.ip,
                },
              },
            },
            { new: true }
          )
          .exec(),
      ]);
    } catch {
      // Throw a generic error if session storage fails
      throw new ApiError(
        'Failed to store session',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected rotateSession = async (payload: {
    id: string;
    oldToken: string;
    newToken: string;
  }): Promise<void> => {
    try {
      const { id, oldToken, newToken } = payload;

      // Hash the new token for secure storage
      const hashedToken = Crypto.hmac(String(newToken), config.HMAC_SECRET);

      // Execute Redis and MongoDB updates in parallel
      await Promise.all([
        (async () => {
          // Create a Redis multi-command pipeline
          const p = nodeClient.multi();

          // Remove the old token from the user's session set in Redis
          p.SREM(`${this.role}/${id}:session`, String(oldToken));

          // Add the new hashed token to the user's session set in Redis
          p.SADD(`${this.role}/${id}:session`, hashedToken);

          // Set expiration for the session set (refresh token TTL in seconds)
          p.EXPIRE(`${this.role}/${id}:session`, REFRESH_TTL * 24 * 60 * 60);

          // Execute all Redis commands in the pipeline
          await p.exec();
        })(),

        // Update the MongoDB user document to replace the old token with the new hashed token
        this.model
          ?.findByIdAndUpdate(
            { _id: id },
            {
              $set: {
                'sessions.$[elem].token': hashedToken,
              },
            },
            {
              arrayFilters: [{ 'elem.token': oldToken }],
              new: true,
            }
          )
          .exec(),
      ]);
    } catch {
      // Throw a generic error if session rotation fails
      throw new ApiError(
        'Failed to rotate session. Please try again later.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected removeASession = async (
    res: Response,
    payload: {
      id: string;
      token: string;
    }
  ): Promise<void> => {
    try {
      const { id, token } = payload;

      // Execute Redis and MongoDB updates in parallel
      await Promise.all([
        (async () => {
          // Create a Redis multi-command pipeline
          const p = nodeClient.multi();

          // Remove the token from the user's session set in Redis
          p.SREM(`${this.role}/${id}:session`, token);

          // Execute the Redis commands
          const [rem] = await p.exec();

          // Ensure that the token existed and was removed
          if (Number(rem) !== 1) {
            throw new Error('Token not found in session set.');
          }
        })(),

        // Update the MongoDB user document to mark the session as inactive
        await this.model
          ?.findByIdAndUpdate(
            { _id: id },
            {
              $set: {
                'sessions.$[elem].status': false,
              },
            },
            {
              arrayFilters: [{ 'elem.token': token }],
              new: true,
            }
          )
          .exec(),
      ]);
    } catch {
      // Throw a generic error if session removal fails
      throw new ApiError(
        'Failed to remove session. Please try again later.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected resetSecurity = async (
    res: Response,
    payload: {
      id: string;
    }
  ): Promise<void> => {
    try {
      const { id } = payload;

      // Execute Redis and MongoDB updates in parallel
      await Promise.all([
        (async () => {
          // Create a Redis multi-command pipeline
          const p = nodeClient.multi();

          // Delete the user's session set from Redis
          p.DEL(`${this.role}/${id}:session`);

          // Delete the user's cached data from Redis
          p.DEL(`${this.role}/${id}`);

          // Execute the Redis commands
          await p.exec();
        })(),

        // Remove all sessions from the MongoDB user document
        this.model
          ?.updateOne(
            { _id: id },
            {
              $unset: {
                sessions: '',
                'authentication.passKeys': '',
              },
              $set: {
                'authentication.twoFA.enabled': false,
                'authentication.twoFA.backupCodes': [],
                'authentication.twoFA.secret': null,
              },
            }
          )
          .exec(),
        Passkeys('Seller').deleteMany({ user: id }),
      ]);

      this.clearAllCookies(res);
    } catch {
      // Throw a generic error if removing all sessions fails
      throw new ApiError(
        'Failed to remove all sessions.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected removeOtherSessions = async (
    req: Request,
    payload: {
      id: string;
    }
  ): Promise<void> => {
    try {
      const { id } = payload;

      // Hash the current access token from signed cookies for secure comparison
      const token = Crypto.hmac(
        req.signedCookies[this.getCookieNames().access],
        config.HMAC_SECRET
      );

      // Execute Redis and MongoDB updates in parallel
      await Promise.all([
        (async () => {
          // Create a Redis multi-command pipeline
          const p = nodeClient.multi();

          // Delete all existing sessions for the user in Redis
          p.DEL(`${this.role}/${id}:session`);

          // Add only the current session token back into Redis
          p.SADD(`${this.role}/${id}:session`, token);

          // Execute the Redis commands
          await p.exec();
        })(),

        // Update the MongoDB user document to remove all other sessions
        this.model
          ?.updateOne(
            { _id: id },
            {
              $pull: {
                sessions: {
                  token: { $ne: token },
                },
              },
            }
          )
          .exec(),
      ]);
    } catch {
      // Throw a generic error if clearing other sessions fails
      throw new ApiError(
        'Failed to clear other sessions.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected pending2FA = async (
    res: Response,
    payload: {
      id: string;
      remember: boolean;
      password: string;
    }
  ): Promise<void> => {
    try {
      const { id, remember, password } = payload;

      // Encrypt the user ID and "remember" flag for secure transmission
      const encrypted = await Crypto.cipheriv(
        {
          id: id,
          remember: remember,
          password: password,
        },
        config.CRYPTO_SECRET
      );

      // Sign the encrypted payload into a JWT token with 5 minutes expiry
      const token = jwt.sign({ encrypted }, config.ACTIVATION_SECRET, {
        expiresIn: '5m',
      });

      // Set a cookie named 'pending2FA' with the token; not httpOnly since user may need it client-side
      res.cookie(...this.createCookie('pending2FA', token, false));
    } catch {
      // Throw a generic error if 2FA setup fails
      throw new ApiError(
        'Failed to create OTP. Please try again.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected encryptBackupCodes = async (
    codes: string[]
  ): Promise<Decipheriv[]> => {
    try {
      return await Promise.all(
        codes.map(async (plain) => {
          const encrypted = await Crypto.cipheriv(plain, config.CRYPTO_SECRET);
          return {
            salt: encrypted.salt,
            iv: encrypted.iv,
            data: encrypted.data,
          };
        })
      );
    } catch {
      throw new ApiError(
        'Failed to encrypt backup codes.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected decryptBackupCodes = async (
    codes: Decipheriv[]
  ): Promise<string[]> => {
    try {
      return await Promise.all(
        codes.map(async (encrypted) => {
          const decrypted = await Crypto.decipheriv<string>(
            encrypted,
            config.CRYPTO_SECRET
          );
          return decrypted;
        })
      );
    } catch {
      throw new ApiError(
        'Failed to decrypt backup codes.',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  };

  protected recoveryCodes = (count = 16, codeLength = 12): string[] => {
    return Array.from({ length: count }, () =>
      randomBytes(Math.ceil(codeLength / 2))
        .toString('base64')
        .replace(/[^A-Z0-9]/gi, '')
        .substring(0, codeLength)
        .toUpperCase()
        .replace(/(.{4})(?=.)/g, '$1-')
    );
  };

  protected formatBackupCode = (code: string, chunkSize = 4): string => {
    const cleaned = code.replace(/-/g, '');
    return cleaned.replace(new RegExp(`(.{${chunkSize}})(?=.)`, 'g'), '$1-');
  };

  protected getPending2FAUser = async (
    req: Request,
    res: Response
  ): Promise<{
    secureUser: IUser;
    basicUser: IUser;
    remember: boolean;
  } | null> => {
    const { encrypted } = jwt.verify(
      req.cookies[this.getCookieNames().pending2FA],
      config.ACTIVATION_SECRET
    ) as { encrypted: Decipheriv };

    const { id, remember, password } = await Crypto.decipheriv<{
      id: string;
      remember: boolean;
      password: string;
    }>(encrypted, config.CRYPTO_SECRET);

    const [secureUser, basicUser] = await Promise.all([
      this.model
        ?.findById({ _id: id })
        .select('authentication.twoFA authentication.password'),
      this.model?.findById({ _id: id }),
    ]);

    if (
      !secureUser ||
      !basicUser ||
      !(await secureUser.isPasswordValid(password))
    ) {
      this.clearCookie(res, 'pending2FA');
      return null;
    }

    return { secureUser, basicUser, remember };
  };

  protected setCacheUser = async (user: IUser) => {
    const p = nodeClient.multi();
    p.json.SET(
      `${this.role}/${user?._id}`,
      '$',
      JSON.parse(JSON.stringify(user?.toObject()))
    );
    p.EXPIRE(`${this.role}/${user?._id}`, REFRESH_TTL * 24 * 60 * 60);
    await p.exec();
  };

  public get engineToolkit() {
    return {
      getDeviceInfo: this.getDeviceInfo.bind(this),
      getLocationInfo: this.getLocationInfo.bind(this),
      creatOtp: this.creatOtp.bind(this),
      storeSession: this.storeSession.bind(this),
      rotateSession: this.rotateSession.bind(this),
      removeASession: this.removeASession.bind(this),
      resetSecurity: this.resetSecurity.bind(this),
      removeOtherSessions: this.removeOtherSessions.bind(this),
      pending2FA: this.pending2FA.bind(this),
      setCacheUser: this.setCacheUser.bind(this),
    };
  }
}
