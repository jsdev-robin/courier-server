import { nodeClient } from '@server/cloud';
import { SendEmail } from '@server/emails';
import { ApiError } from '@server/middlewares';
import { REFRESH_TTL } from '@server/protect';
import { Crypto, Decipheriv } from '@server/security';
import { IUser, Role } from '@server/types';
import { CloudinaryService } from '@server/upload';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose, { Model } from 'mongoose';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';
import { config } from '../../configs/configs';
import { Passkeys } from '../../models/passkeys/passkeyModel';
import { PasswordForgotModel } from '../../models/password/passwordChangeModel';
import { AuthEngine } from './engine/AuthEngine';
import { TokenSignature } from './engine/TokenService';
import {
  IChangePasswordRequest,
  IDisconnectOauthRequest,
  IFinish2FASetupRequest,
  IFinishAuthenticationRequest,
  IFinishEmailChangeRequest,
  IFinishPasswordResetRequest,
  IFinishRegistrationRequest,
  ISigninRequest,
  ISignupRequest,
  IStartAuthenticationRequest,
  IStartEmailChangeRequest,
  IStartPasswordResetRequest,
  IVerify2FASignInRequest,
  IVerifyBackupCodeRequest,
  IVerifyRequest,
} from './types/auth';

export class AuthService extends AuthEngine {
  PassKeys: ReturnType<typeof Passkeys>;
  constructor(options: { model?: Model<IUser>; role: Role }) {
    super(options);
    this.PassKeys = Passkeys(
      options.role.charAt(0).toUpperCase() + options.role.slice(1).toLowerCase()
    );
  }

  public signup: RequestHandler = catchAsync(
    async (
      req: ISignupRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // Extract user signup data from request body
      const { familyName, givenName, email, password } = req.body;

      // Check if a user with the provided email already exists in the database
      const userExists = await this.model
        ?.findOne({
          $or: [
            { 'personalInfo.email': email },
            { 'authentication.oauth.email': email },
          ],
        })
        .lean()
        .exec();

      // If user already exists, throw a BAD_REQUEST error
      if (userExists) {
        return next(
          new ApiError(
            'This email is already registered. Use a different email address.',
            HttpStatusCode.BAD_REQUEST
          )
        );
      }

      // Prepare user data for OTP generation
      const data = {
        familyName,
        givenName,
        email,
        password,
      };

      // Generate OTP and token for email verification
      const { token, solidOTP } = await this.creatOtp(req, data);

      // Prepare payload for sending verification email
      const mailPayload = {
        user: {
          name: familyName,
          email,
        },
        otp: solidOTP,
      };

      // Send verification email
      await new SendEmail(mailPayload)
        .verifyEmail()
        .then(() => {
          // If email sent successfully, respond with success status and token
          res.status(HttpStatusCode.OK).json({
            status: Status.SUCCESS,
            message:
              'Verification code sent successfully to your email address.',
            data: {
              token,
            },
          });
        })
        .catch(() => {
          // If sending email fails, return INTERNAL_SERVER_ERROR
          return next(
            new ApiError(
              'An error occurred while sending the verification email. Please try again later.',
              HttpStatusCode.INTERNAL_SERVER_ERROR
            )
          );
        });
    }
  );

  public verify: RequestHandler = catchAsync(
    async (
      req: IVerifyRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // Extract OTP and token from request body
      const { otp, token } = req.body;

      // Verify the JWT token and extract the encrypted data
      const { encrypted } = jwt.verify(token, config.ACTIVATION_SECRET) as {
        encrypted: Decipheriv;
      };

      // Decrypt the encrypted payload to get user signup data and OTP
      const { familyName, givenName, email, password, solidOTP } =
        await Crypto.decipheriv<{
          familyName: string;
          givenName: string;
          email: string;
          password: string;
          solidOTP: string;
        }>(encrypted, config.CRYPTO_SECRET);

      const aBuf = String(solidOTP); // Original OTP
      const bBuf = String(otp); // OTP provided by user

      // Compare the provided OTP with the original OTP securely
      const correctOTP = Crypto.safeCompare(aBuf, bBuf);

      // If OTP does not match, return BAD_REQUEST error
      if (!correctOTP) {
        return next(
          new ApiError(
            'The OTP you entered does not match. Please double-check the code and try again.',
            HttpStatusCode.BAD_REQUEST
          )
        );
      }

      // Prepare payload for creating the verified user in the database
      const payload = {
        personalInfo: {
          familyName,
          givenName,
          email,
        },
        authentication: {
          password,
          isVerified: true,
        },
        role: this.role,
      };

      // Create the user in the database
      await this.model?.create(payload);

      // Respond with success message
      res.status(HttpStatusCode.CREATED).json({
        status: Status.SUCCESS,
        message: 'Your account has been successfully verified.',
      });
    }
  );

  public signin: RequestHandler = catchAsync(
    async (
      req: ISigninRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      // Extract credentials and remember flag from request body
      const { email, password, remember } = req.body;

      // Find user by email and explicitly select the password field
      const user = await this.model
        ?.findOne({ 'personalInfo.email': email })
        .select('+authentication.password +authentication.twoFA.enabled +role')
        .exec();

      // If user not found OR password is invalid → return unauthorized error
      if (!user || !(await user.isPasswordValid(password))) {
        return next(
          new ApiError(
            'Incorrect email or password. Please check your credentials and try again.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      // If 2FA is enabled for this user → create a pending 2FA session
      if (user?.authentication?.twoFA.enabled) {
        await this.pending2FA(res, {
          id: user.id,
          remember: remember,
          password: password,
        });
        res.status(HttpStatusCode.OK).json({
          status: Status.SUCCESS,
          message:
            'Sign-in successful. Please complete two-factor authentication.',
          data: {
            enable2fa: true,
          },
        });
        return;
      }

      // Remove password from the user object before attaching to request
      user.authentication.password = undefined;
      // Attach authenticated user to request
      req.self = user;
      // Attach remember flag to request
      req.remember = remember;
      // Pass control to next middleware (e.g. createSession)
      next();
    }
  );

  public createSession: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // user object attached to request (from middleware)
      const user = req.self;
      // "remember me" option (affects cookie expiry)
      const remember = req.remember;

      // Generate new access, refresh, and protect tokens
      const [accessToken, refreshToken, protectToken] = this.rotateToken(req, {
        id: user.id,
        role: user.role,
        remember,
      });

      // Save access token in cookie
      res.cookie(...this.createCookie('access', accessToken, remember));
      // Save refresh token in cookie
      res.cookie(...this.createCookie('refresh', refreshToken, remember));
      // Save protect token in cookie
      res.cookie(...this.createCookie('protect', protectToken, remember));
      // Clear pending 2FA cookie
      this.clearCookie(res, 'pending2FA');

      // Store session with user and access token
      await this.storeSession(req, { user, accessToken });

      try {
        res.status(HttpStatusCode.OK).json({
          status: Status.SUCCESS,
          message: `Welcome back ${user?.personalInfo.familyName}.`,
          data: {
            role: user?.role,
          },
        });
      } catch (error) {
        // If an error occurs and headers aren’t sent yet → clear all cookies
        if (!res.headersSent) {
          this.clearAllCookies(res);
        }
        // Pass error to next middleware
        next(error);
      }
    }
  );

  public refreshToken: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Get refresh token from cookies
      const refreshCookie = req.cookies[this.getCookieNames().refresh];

      // Exit early if no refresh token is found
      if (!refreshCookie) {
        return this.sessionUnauthorized(res, next);
      }

      try {
        // Verify and decode the refresh token payload
        const decode = jwt.verify(
          refreshCookie,
          config.REFRESH_TOKEN
        ) as TokenSignature;

        if (this.checkTokenSignature(decode, req)) {
          return this.sessionUnauthorized(res, next);
        }

        const { remember, id, role, token } = decode;

        // Rotate access and refresh tokens
        const [accessToken, refreshToken, protectToken] = this.rotateToken(
          req,
          {
            id: id,
            role: role,
            remember: remember,
          }
        );

        // Sets access token as a cookie
        res.cookie(...this.createCookie('access', accessToken, remember));
        // Sets refresh token as a cookie
        res.cookie(...this.createCookie('refresh', refreshToken, remember));
        // Sets protect token as a cookie
        res.cookie(...this.createCookie('protect', protectToken, remember));

        // Hash new access token for Redis and DB session comparison
        const oldToken = token;
        const newToken = accessToken;

        await this.rotateSession({
          id: id,
          oldToken,
          newToken,
        });

        // Respond with success message
        res.status(200).json({
          status: Status.SUCCESS,
          message: 'Token refreshed successfully.',
        });
      } catch (error) {
        // If headers haven't been sent yet, clear cookies and pass error to next handler
        if (!res.headersSent) {
          this.clearAllCookies(res);
        }
        next(error);
      }
    }
  );

  public signout: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      // Retrieve the access token from signed cookies
      const accessToken = req.signedCookies[this.getCookieNames().access];

      // Get the currently authenticated user from the request
      const user = req.self;

      // Remove the user's session using their ID and hashed access token
      await this.removeASession(res, {
        id: user.id,
        token: Crypto.hmac(accessToken, config.HMAC_SECRET),
      });

      // Clear all cookies set in the response
      this.clearAllCookies(res);

      // Send a success response to the client indicating signout is complete
      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'You have been successfully signed out.',
      });
    }
  );

  public signoutSession: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      // Extract the session token from the request parameters
      const { token } = req.params;

      // Get the currently authenticated user from the request
      const user = req.self;

      // Remove the specific session associated with this user and token
      await this.removeASession(res, {
        id: user.id,
        token: token,
      });

      // Send a success response to the client indicating the session logout is complete
      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'You have been successfully logged out.',
      });
    }
  );

  public signoutAllSession: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      // Get the currently authenticated user from the request
      const user = req.self;

      // Remove all sessions for this user except the current one
      await this.removeOtherSessions(req, {
        id: user.id,
      });

      // Send a success response to the client indicating all other sessions have been logged out
      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'You have been successfully logged out.',
      });
    }
  );

  public getProfile: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      // User is already attached to request via auth middleware
      const user = req.self;

      // Consider returning only necessary profile data
      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Profile retrieved successfully',
        data: {
          user,
        },
      });
    }
  );

  public updateProfile: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Extract uploaded file from the request
      const file = req.file as Express.Multer.File;

      // Get the current avatar's public_id (if exists) for deletion
      const publicId = req.self.personalInfo?.avatar?.public_id;

      // Retrieve user document from the database
      const user = await this.model?.findById(req.self._id);

      // Handle case where user is not found
      if (!user) {
        return next(
          new ApiError('Oops! User does not exist', HttpStatusCode.NOT_FOUND)
        );
      }

      // Update user's personal information
      Object.assign(user.personalInfo, req.body.personalInfo);

      // If a new avatar file is uploaded, upload it to Cloudinary and remove the old one
      if (file) {
        const result = await CloudinaryService.upload(file.buffer);
        await CloudinaryService.delete(publicId);

        // Save new avatar details (URL and public_id)
        user.personalInfo.avatar = {
          url: result?.url,
          public_id: result?.public_id,
        };
      }

      // Persist updated user data to the database
      await user.save();

      // Refresh cached user data for faster future access
      await this.setCacheUser(user);

      // Send successful update response
      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Your profile updated successfully',
      });
    }
  );

  public sessions: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const user = await this.model?.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(req.self.id) },
        },
        {
          $project: {
            sessions: {
              $sortArray: {
                input: '$sessions',
                sortBy: { loggedInAt: -1 },
              },
            },
          },
        },
      ]);

      if (!user) {
        return next(
          new ApiError(
            'No user found. Please log in again to access your account.',
            HttpStatusCode.NOT_FOUND
          )
        );
      }

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'User sessions retrieved successfully',
        data: {
          sessions: user[0]?.sessions ?? [],
        },
      });
    }
  );

  public startRegistration: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Get the current user from request
      const user = req.self;

      // Handle missing user session
      if (!user) {
        return next(
          new ApiError(
            'Your session may have expired. Please log in again.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      // Fetch existing passkeys for the user
      const userPasskeys = await this.PassKeys.find({ user: user._id });

      // Generate WebAuthn registration options
      const options = await generateRegistrationOptions({
        rpName: config.RP_NAME,
        rpID: config.RP_ID,
        userName: user.personalInfo.email,
        userID: Uint8Array.from(new TextEncoder().encode(user.id)),
        userDisplayName: user.personalInfo.displayName,
        attestationType: 'none',
        excludeCredentials: userPasskeys.map((passkey) => ({
          id: passkey.credentialID,
          transports: passkey.transports,
        })),
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
        preferredAuthenticatorType: 'localDevice',
      });

      // Store challenge in Redis with a TTL of 300 seconds
      await nodeClient.setEx(
        `reg_challenge:${user._id}`,
        300,
        JSON.stringify({ challenge: options.challenge })
      );

      // Send registration options to client
      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message:
          'Ready to set up your passkey. Follow the next steps to complete registration.',
        data: options,
      });
    }
  );

  public finishRegistration = (origin: string): RequestHandler =>
    catchAsync(
      async (
        req: IFinishRegistrationRequest,
        res: Response,
        next: NextFunction
      ): Promise<void> => {
        // Extract credential data from request body
        const { credential } = req.body;

        // Get the currently authenticated user
        const user = req.self;

        // Retrieve the stored registration challenge from Redis
        const storedChallenge = await nodeClient.get(
          `reg_challenge:${user._id}`
        );

        // Handle case when challenge is not found
        if (!storedChallenge) {
          return next(
            new ApiError(
              'No registration challenge found. Please restart the registration process.',
              HttpStatusCode.NOT_FOUND
            )
          );
        }

        // Parse the stored challenge
        const { challenge } = JSON.parse(storedChallenge);

        // Verify the registration response using WebAuthn
        const verification = await verifyRegistrationResponse({
          response: credential,
          expectedChallenge: challenge,
          expectedOrigin: origin,
          expectedRPID: config.RP_ID,
        });

        // Destructure verification results
        const { verified, registrationInfo } = verification;

        // Handle failed verification
        if (!verified || !registrationInfo) {
          return next(
            new ApiError(
              'Passkey registration could not be verified. Please try again.',
              HttpStatusCode.UNAUTHORIZED
            )
          );
        }

        // Destructure registration info for storing
        const {
          credential: regCredential,
          credentialDeviceType,
          credentialBackedUp,
        } = registrationInfo;

        const device = this.getDeviceInfo(req);
        // Create a new passkey document
        const newPasskey = new this.PassKeys({
          user: user._id,
          device: device.os,
          browser: device.browser,
          formFactor: device.deviceType,
          webAuthnUserID: new TextEncoder().encode(user._id.toString()),
          id: regCredential.id,
          publicKey: regCredential.publicKey,
          counter: regCredential.counter,
          transports: regCredential.transports,
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          credentialID: regCredential.id,
        });

        // Save the new passkey in the database
        await newPasskey.save();

        // Count total passkeys for the user
        const passkeyCount = await this.PassKeys.countDocuments({
          user: user._id,
        });

        // Update user session with passkey information
        const newSession: IUser = await this.model
          ?.findByIdAndUpdate(
            user._id,
            {
              $set: {
                'authentication.passKeys.hasPasskeys': true,
                'authentication.passKeys.passkeyCount': passkeyCount,
                'authentication.passKeys.lastPasskeyUsed': new Date(),
              },
            },
            { new: true }
          )
          .select('-authentication.password');

        // Update Redis: remove used challenge and store updated session
        const p = nodeClient.multi();
        p.del(`reg_challenge:${user._id}`);
        p.json.SET(
          `${this.role}/${newSession?._id}`,
          '$',
          newSession.toObject()
        );
        p.EXPIRE(`${this.role}/${newSession?._id}`, REFRESH_TTL * 24 * 60 * 60);
        await p.exec();

        // Send success response to client
        res.status(HttpStatusCode.OK).json({
          status: Status.SUCCESS,
          message:
            'Your passkey has been successfully registered and is ready to use.',
        });
      }
    );

  public startAuthentication: RequestHandler = catchAsync(
    async (
      req: IStartAuthenticationRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { email } = req.body;

      // Find user by email
      const user = await this.model
        ?.findOne({ 'personalInfo.email': email })
        .exec();

      // Handle case when user is not found
      if (!user) {
        return next(
          new ApiError(
            'No account found with this email. Please check and try again.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      if (!user.authentication.passKeys.hasPasskeys) {
        return next(
          new ApiError(
            'No passkeys are registered for this account. Please register a passkey first.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      // Fetch registered passkeys for the user
      const userPasskeys = await this.PassKeys.find({
        user: user._id,
      });

      // Handle case when user has no passkeys
      if (!userPasskeys || userPasskeys.length === 0) {
        return next(
          new ApiError(
            'No passkeys registered for this account. Please register a passkey first.',
            HttpStatusCode.BAD_REQUEST
          )
        );
      }

      // Generate WebAuthn authentication options
      const options = await generateAuthenticationOptions({
        rpID: config.RP_ID,
        allowCredentials: userPasskeys.map((passkey) => ({
          id: passkey.credentialID,
          transports: passkey.transports,
        })),
        userVerification: 'preferred',
      });

      // Save authentication challenge in Redis with TTL
      await nodeClient.setEx(
        `auth_challenge:${user._id}`,
        300,
        JSON.stringify({ challenge: options.challenge })
      );

      // Send authentication options to client
      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message:
          'Passkey authentication initiated! Follow the instructions to securely sign in.',
        data: {
          options,
          email,
        },
      });
    }
  );

  public finishAuthentication = (origin: string): RequestHandler =>
    catchAsync(
      async (
        req: IFinishAuthenticationRequest,
        res: Response,
        next: NextFunction
      ): Promise<void> => {
        // Extract email and credential from request body
        const { email, credential } = req.body;

        // Find user by email
        const user = await this.model
          ?.findOne({ 'personalInfo.email': email })
          .exec();

        // Handle case when user is not found
        if (!user) {
          return next(
            new ApiError(
              'No account found with this email. Please check and try again.',
              HttpStatusCode.UNAUTHORIZED
            )
          );
        }

        if (!user.authentication.passKeys.hasPasskeys) {
          return next(
            new ApiError(
              'No passkeys are registered for this account. Please register a passkey first.',
              HttpStatusCode.UNAUTHORIZED
            )
          );
        }

        // Retrieve stored authentication challenge from Redis
        const storedChallenge = await nodeClient.get(
          `auth_challenge:${user._id}`
        );

        // Handle missing challenge
        if (!storedChallenge) {
          return next(
            new ApiError('Challenge not found', HttpStatusCode.NOT_FOUND)
          );
        }

        // Parse the stored challenge
        const { challenge } = JSON.parse(storedChallenge);

        // Find the passkey used for this authentication
        const passkey = await this.PassKeys.findOne({
          credentialID: credential.id,
          user: user._id,
        });

        // Handle case when passkey is not found
        if (!passkey) {
          return next(
            new ApiError(
              'No passkeys are registered for this account. Please register a passkey first.',
              HttpStatusCode.NOT_FOUND
            )
          );
        }

        // Verify the authentication response
        const verification = await verifyAuthenticationResponse({
          response: credential,
          expectedChallenge: challenge,
          expectedOrigin: origin,
          expectedRPID: config.RP_ID,
          credential: {
            id: passkey?.credentialID,
            publicKey: new Uint8Array(
              passkey?.publicKey.split(',').map(Number)
            ),
            counter: passkey?.counter,
            transports: passkey?.transports,
          },
        });

        // Destructure verification results
        const { verified, authenticationInfo } = verification;

        // Handle failed verification
        if (!verified || !authenticationInfo) {
          return next(
            new ApiError(
              'Authentication verification failed',
              HttpStatusCode.UNAUTHORIZED
            )
          );
        }

        // Update passkey counter
        passkey.counter = authenticationInfo.newCounter;
        await passkey.save();

        // Update user session with passkey info
        const newSession: IUser = await this.model
          ?.findByIdAndUpdate(
            user._id,
            {
              $set: {
                'authentication.passKeys.passkeyCount':
                  authenticationInfo.newCounter,
                'authentication.passKeys.lastPasskeyUsed': new Date(),
              },
            },
            { new: true }
          )
          .select('-authentication.password');

        // Remove used challenge from Redis
        await nodeClient.del(`auth_challenge:${user._id}`);

        // Attach new session and remember flag to request
        req.self = newSession;
        req.remember = true;

        // Proceed to next middleware
        next();
      }
    );

  public spyPasskeys: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = req.self;

      const passkeys = await this.PassKeys.find({ user: user._id }).select(
        'name device browser formFactor createdAt'
      );

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Passkey information retrieved successfully.',
        data: {
          passkeys: passkeys,
        },
      });
    }
  );

  public unregisterPasskey: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const passkey = await this.PassKeys.findByIdAndDelete(req.params.id);

      if (!passkey) {
        return next(
          new ApiError(
            'No passkey found. Please try again.',
            HttpStatusCode.NOT_FOUND
          )
        );
      }

      const user = await this.model?.findByIdAndUpdate(
        req.self._id,
        [
          {
            $set: {
              'authentication.passKeys.passkeyCount': {
                $max: [
                  { $subtract: ['$authentication.passKeys.passkeyCount', 1] },
                  0,
                ],
              },
            },
          },
          {
            $set: {
              'authentication.passKeys.hasPasskeys': {
                $gt: [
                  { $subtract: ['$authentication.passKeys.passkeyCount', 1] },
                  0,
                ],
              },
            },
          },
        ],
        { new: true }
      );

      if (!user) {
        return next(
          new ApiError('Oops! User does not exist', HttpStatusCode.NOT_FOUND)
        );
      }

      await this.setCacheUser(user);

      res.status(HttpStatusCode.NO_CONTENT).send();
    }
  );

  public startPasswordReset = (url: string): RequestHandler =>
    catchAsync(
      async (
        req: IStartPasswordResetRequest,
        res: Response,
        next: NextFunction
      ): Promise<void> => {
        const user = await this.model?.findOne({
          'personalInfo.email': req.body.email,
        });

        if (!user) {
          return next(
            new ApiError(
              'If this email exists in our system, you will receive a password reset link shortly.',
              HttpStatusCode.OK
            )
          );
        }

        const resetEntry = new PasswordForgotModel();
        const resetToken = resetEntry.createResetToken(user.id);

        try {
          await resetEntry.save();
        } catch (error: unknown) {
          if (
            error instanceof mongoose.mongo.MongoServerError &&
            error.code === 11000
          ) {
            return next(
              new ApiError(
                'A password reset request already exists for this account. Please wait 10 minutes before requesting another reset link.',
                HttpStatusCode.CONFLICT
              )
            );
          }

          throw error;
        }
        const mailData = {
          user: {
            name: user.personalInfo.familyName,
            email: user.personalInfo.email,
          },
          resetUrl: `${url}/forgot-password/${resetToken}/reset`,
          clientInfo: this.getDeviceInfo(req),
        };

        try {
          await new SendEmail(mailData).forgotPassword();

          res.status(HttpStatusCode.OK).json({
            status: Status.SUCCESS,
            message:
              'Password reset link has been sent to your email. Please check your inbox (and spam folder) for instructions.',
          });
        } catch {
          await PasswordForgotModel.findOneAndDelete({ userId: user.id });

          return next(
            new ApiError(
              'We encountered an issue sending the password reset email. Please try again in a few minutes.',
              HttpStatusCode.INTERNAL_SERVER_ERROR
            )
          );
        }
      }
    );

  public finishPasswordReset: RequestHandler = catchAsync(
    async (
      req: IFinishPasswordResetRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const hashedToken = Crypto.hash(req.params.token);

      const tokenDoc = await PasswordForgotModel.findOne({
        token: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!tokenDoc) {
        return next(
          new ApiError(
            'The password reset link has expired or is invalid. Please request a new one.',
            HttpStatusCode.BAD_REQUEST
          )
        );
      }

      const user = await this.model?.findById(tokenDoc.userId);

      if (!user) {
        return next(
          new ApiError(
            'The user associated with this password reset request was not found.',
            HttpStatusCode.NOT_FOUND
          )
        );
      }

      user.authentication.password = req.body.newPassword;
      await user.save();

      await PasswordForgotModel.deleteOne({ _id: tokenDoc._id });

      await this.resetSecurity(res, { id: user.id });

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Your password has been successfully reset.',
      });
    }
  );

  public changePassword: RequestHandler = catchAsync(
    async (
      req: IChangePasswordRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { currentPassword, newPassword } = req.body;

      const user = await this.model
        ?.findById(req.self?._id)
        .select('+authentication.password');

      if (!(await user?.isPasswordValid(currentPassword)) || !user) {
        return next(
          new ApiError(
            'The current password you entered is incorrect. Please double-check and try again.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      if (await user.isPasswordValid(newPassword)) {
        return next(
          new ApiError(
            'New password must be different from the current password.',
            HttpStatusCode.BAD_REQUEST
          )
        );
      }

      user.authentication.password = newPassword;
      await user.save();

      await this.resetSecurity(res, {
        id: user?.id,
      });

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message:
          'Your password has been updated successfully. Please use your new password the next time you log in.',
      });
    }
  );

  public start2FASetup: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const user = req.self;

      const secret = speakeasy.generateSecret({
        name: `Devmun:${Crypto.hash(user?.personalInfo.email)}`,
      });

      if (!secret.otpauth_url) {
        return next(
          new ApiError(
            'Failed to generate otpauth_url',
            HttpStatusCode.INTERNAL_SERVER_ERROR
          )
        );
      }

      const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

      res.status(HttpStatusCode.OK).json({
        status: 'success',
        message: '2FA setup generated successfully.',
        data: {
          secret: secret.base32,
          otpauth_url: secret.otpauth_url,
          qrCodeDataUrl,
        },
      });
    }
  );

  public finish2FASetup: RequestHandler = catchAsync(
    async (
      req: IFinish2FASetupRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { totp, secret } = req.body;

      const isVerified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: totp,
        window: 1,
      });

      if (!isVerified) {
        return next(
          new ApiError(
            'Invalid or expired 2FA token.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      const encryptedKey = await Crypto.cipheriv(secret, config.CRYPTO_SECRET);
      const codes = this.recoveryCodes();
      const encryptedCodes = await this.encryptBackupCodes(codes);

      const user = await this.model
        ?.findByIdAndUpdate(
          req.self._id,
          {
            $set: {
              'authentication.twoFA.enabled': true,
              'authentication.twoFA.secret': encryptedKey,
              'authentication.twoFA.backupCodes': encryptedCodes,
            },
          },
          { new: true }
        )
        .exec();

      if (!user) {
        return next(
          new ApiError(
            'Your session may have expired. Please log in again.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      // user.authentication.twoFA.backupCodes = encryptedCodes;
      // await user.save()

      const p = nodeClient.multi();
      p.json.SET(
        `${this.role}/${user?._id}`,
        '$',
        JSON.parse(JSON.stringify(user?.toObject()))
      );
      p.EXPIRE(`${this.role}/${user?._id}`, REFRESH_TTL * 24 * 60 * 60);
      await p.exec();

      res.status(HttpStatusCode.OK).json({
        status: 'success',
        message: '2FA has been confirmed and enabled.',
      });
    }
  );

  public verify2FASignIn: RequestHandler = catchAsync(
    async (
      req: IVerify2FASignInRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { totp } = req.body;

      const data = await this.getPending2FAUser(req, res);
      if (!data) {
        return next(
          new ApiError(
            'Your 2FA session has expired. Please log in again to continue.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      const { secureUser, basicUser, remember } = data;

      const base32Secret = await Crypto.decipheriv<string>(
        secureUser?.authentication.twoFA.secret,
        config.CRYPTO_SECRET
      );

      const isVerified = speakeasy.totp.verify({
        secret: base32Secret ?? '',
        encoding: 'base32',
        token: totp,
        window: 0,
      });

      if (!isVerified) {
        return next(
          new ApiError(
            'Invalid or expired 2FA token. Check your Google Authenticator app and try again.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      this.clearCookie(res, 'pending2FA');

      req.self = basicUser;
      req.remember = remember;
      next();
    }
  );

  public remove2FA: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const user = await this.model?.findByIdAndUpdate(
        req.self.id,
        {
          $set: {
            'authentication.twoFA.enabled': false,
          },
          $unset: {
            'authentication.twoFA.backupCodes': 1,
            'authentication.twoFA.secret': 1,
          },
        },
        { new: true }
      );

      if (!user) {
        return next(
          new ApiError('Oops! User does not exist', HttpStatusCode.NOT_FOUND)
        );
      }

      await this.setCacheUser(user);

      res.status(HttpStatusCode.OK).json({
        status: 'success',
        message: '2FA removed successfully.',
      });
    }
  );

  public startBackupCodesSetup: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const user = await this.model?.findById(req.self._id);

      if (!user) {
        return next(
          new ApiError(
            'Your session may have expired. Please log in again.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      if (!user.authentication?.twoFA?.enabled) {
        return next(
          new ApiError(
            'Two-factor authentication is not enabled. Please enable 2FA first.',
            HttpStatusCode.BAD_REQUEST
          )
        );
      }

      const codes = this.recoveryCodes();
      const encryptedCodes = await this.encryptBackupCodes(codes);

      await this.model?.findByIdAndUpdate(
        req.self._id,
        {
          $set: {
            'authentication.twoFA.backupCodes': encryptedCodes,
          },
        },
        { new: true }
      );

      res.status(HttpStatusCode.OK).json({
        status: 'success',
        message: '2FA backup codes generated successfully.',
      });
    }
  );

  public recoverBackupCodes: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const user = await this.model
        ?.findById(req.self._id)
        .select('authentication.twoFA.backupCodes');

      if (!user) {
        return next(
          new ApiError(
            'Your session may have expired. Please log in again.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      const decryptedCodes = await this.decryptBackupCodes(
        user.authentication.twoFA.backupCodes
      );

      res.status(HttpStatusCode.OK).json({
        status: 'success',
        message: '2FA backup codes retrieved successfully.',
        data: {
          codes: decryptedCodes,
        },
      });
    }
  );

  public verifyBackupCode: RequestHandler = catchAsync(
    async (
      req: IVerifyBackupCodeRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const code = this.formatBackupCode(req.body.code);

      const data = await this.getPending2FAUser(req, res);
      if (!data) {
        return next(
          new ApiError(
            'Your 2FA session has expired. Please log in again to continue.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      const { secureUser, basicUser, remember } = data;

      const decryptedCodes = await this.decryptBackupCodes(
        secureUser.authentication.twoFA.backupCodes
      );

      if (!decryptedCodes.includes(code)) {
        return next(
          new ApiError(
            'Invalid backup code. Please try again.',
            HttpStatusCode.UNAUTHORIZED
          )
        );
      }

      const remainingCodes = decryptedCodes.filter((c) => c !== code);
      const encryptedRemaining = await this.encryptBackupCodes(remainingCodes);
      secureUser.authentication.twoFA.backupCodes = encryptedRemaining;

      await secureUser.save();

      this.clearCookie(res, 'pending2FA');

      req.self = basicUser;
      req.remember = remember;
      next();
    }
  );

  public startEmailChange = (url: string): RequestHandler =>
    catchAsync(
      async (
        req: IStartEmailChangeRequest,
        res: Response,
        next: NextFunction
      ): Promise<void> => {
        const { newEmail, password } = req.body;

        const emailExists = await this.model
          ?.findOne({ 'personalInfo.email': newEmail })
          .exec();

        if (emailExists) {
          return next(
            new ApiError(
              'This email is already in use by another account.',
              HttpStatusCode.CONFLICT
            )
          );
        }

        const user = await this.model
          ?.findById(req.self?._id)
          .select('+authentication.password');

        // Check if user exists and password is valid
        if (!user || !(await user.isPasswordValid(password))) {
          return next(
            new ApiError(
              'The current password you entered is incorrect. Please double-check and try again.',
              HttpStatusCode.UNAUTHORIZED
            )
          );
        }

        const clientMeta = {
          ip: req.ip,
          location: req.ipinfo?.location,
          device: req.useragent?.os,
          oldEmail: user.personalInfo.email,
          newEmail: newEmail,
        };

        const { token, solidOTP } = await this.creatOtp(req, clientMeta);

        const newEmailPayload = {
          user: {
            name: user.personalInfo.displayName,
            email: newEmail,
          },
          url: `${url}/${token}`,
          ...clientMeta,
        };

        const oldEmailPayload = {
          user: {
            name: user.personalInfo.displayName,
            email: user.personalInfo?.email,
          },
          otp: solidOTP,
          ...clientMeta,
        };

        await Promise.all([
          new SendEmail(oldEmailPayload).emailChangeAlert(),
          new SendEmail(newEmailPayload).emailChangeRequest(),
        ])
          .then(() => {
            res.status(HttpStatusCode.OK).json({
              status: Status.SUCCESS,
              message:
                'Verification emails have been sent to both your old and new email addresses. Please check your inboxes to confirm the email update.',
            });
          })
          .catch(() => {
            next(
              new ApiError(
                'An error occurred while sending the verification emails. Please try again later.',
                HttpStatusCode.INTERNAL_SERVER_ERROR
              )
            );
          });
      }
    );

  public finishEmailChange: RequestHandler = catchAsync(
    async (
      req: IFinishEmailChangeRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { code } = req.body;
      const token = String(req.params.token);

      const { encrypted } = jwt.verify(
        String(token),
        config.ACTIVATION_SECRET
      ) as {
        encrypted: Decipheriv;
      };

      const { oldEmail, newEmail, solidOTP } = await Crypto.decipheriv<{
        oldEmail: string;
        newEmail: string;
        solidOTP: string;
      }>(encrypted, config.CRYPTO_SECRET);

      const aBuf = String(code);
      const bBuf = String(solidOTP);

      const correctOTP = Crypto.safeCompare(aBuf, bBuf);

      if (!correctOTP) {
        return next(
          new ApiError(
            'The OTP you entered does not match. Please double-check the code and try again.',
            HttpStatusCode.BAD_REQUEST
          )
        );
      }

      const user = await this.model?.findOneAndUpdate(
        { 'personalInfo.email': oldEmail },
        { $set: { 'personalInfo.email': newEmail } },
        { new: true }
      );

      if (!user) {
        return next(
          new ApiError(
            'User not found or already updated. Please request a new email change.',
            HttpStatusCode.NOT_FOUND
          )
        );
      }

      await this.resetSecurity(res, { id: user?.id });

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Your email has been successfully updated.',
      });
    }
  );

  public disconnectOauth: RequestHandler = catchAsync(
    async (
      req: IDisconnectOauthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { email, provider } = req.body;

      const user = await this.model?.findByIdAndUpdate(
        req.self._id,
        {
          $pull: {
            'authentication.oauth': {
              provider: provider,
              email: email,
            },
          },
        },
        { new: true }
      );

      if (!user) {
        return next(
          new ApiError(
            'OAuth provider not found or already disconnected.',
            HttpStatusCode.OK
          )
        );
      }

      await this.setCacheUser(user);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'OAuth provider has been successfully disconnected.',
      });
    }
  );
}
