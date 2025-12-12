import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { Request } from 'express';

export interface ISignupRequest extends Request {
  body: {
    familyName: string;
    givenName: string;
    email: string;
    password: string;
  };
}

export interface IVerifyRequest extends Request {
  body: {
    otp: string;
    token: string;
  };
}

export interface ISigninRequest extends Request {
  body: {
    email: string;
    password: string;
    remember: boolean;
  };
}

export interface IStartRegistrationRequest extends Request {
  body: {
    email: string;
  };
}

export interface IFinishRegistrationRequest extends Request {
  body: {
    email: string;
    credential: RegistrationResponseJSON;
  };
}

export interface IStartAuthenticationRequest extends Request {
  body: {
    email: string;
  };
}

export interface IFinishAuthenticationRequest extends Request {
  body: {
    email: string;
    credential: AuthenticationResponseJSON;
  };
}

export interface IFinishRegistrationRequest extends Request {
  body: {
    credential: RegistrationResponseJSON;
  };
}

export interface IStartPasswordResetRequest extends Request {
  body: {
    email: string;
  };
}

export interface IFinishPasswordResetRequest extends Request {
  body: {
    newPassword: string;
  };
}

export interface IChangePasswordRequest extends Request {
  body: {
    currentPassword: string;
    newPassword: string;
  };
}

export interface IFinish2FASetupRequest extends Request {
  body: {
    totp: string;
    secret: string;
  };
}

export interface IVerify2FASignInRequest extends Request {
  body: {
    totp: string;
  };
}

export interface IVerifyBackupCodeRequest extends Request {
  body: {
    code: string;
  };
}

export interface IStartEmailChangeRequest extends Request {
  body: {
    newEmail: string;
    password: string;
  };
}

export interface IFinishEmailChangeRequest extends Request {
  body: {
    code: string;
  };
}

export interface IDisconnectOauthRequest extends Request {
  body: {
    provider: string;
    email: string;
  };
}
