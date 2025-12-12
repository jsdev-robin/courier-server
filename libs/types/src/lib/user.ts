export function types(): string {
  return 'types';
}
import { Decipheriv } from '@server/security';
import { Document, Types } from 'mongoose';

export type Role =
  | 'superadmin'
  | 'admin'
  | 'support'
  | 'operations'
  | 'finance'
  | 'marketing'
  | 'agent'
  | 'user';

export interface ISession {
  token?: string;
  deviceInfo?: {
    deviceType?: string;
    os?: string;
    browser?: string;
    userAgent?: string;
  };
  ip?: string;
  location?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  loggedInAt?: Date;
  expiresAt?: Date;
  revoked?: boolean;
  revokedAt?: Date;
  lastActivityAt?: Date;
  riskScore?: number;
  trustedDevice?: boolean;
  status?: boolean;
}

export interface Oauth {
  provider:
    | 'jwt'
    | 'google'
    | 'github'
    | 'twitter'
    | 'facebook'
    | 'discord'
    | 'linkedin';
  email?: string;
  _raw: Record<string, unknown>;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  id: string;
  personalInfo: {
    familyName: string;
    givenName: string;
    displayName: string;
    email: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';
    nationality?: string;
    address?: string;
    avatar?: {
      public_id?: string;
      url?: string;
    };
    socialLinks?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      youtube?: string;
    };
    emergencyContacts?: { name: string; phone: string; relation: string }[];
  };

  authentication: {
    password?: string;
    isVerified: boolean;
    passKeys: {
      hasPasskeys: boolean;
      passkeyCount: number;
      lastPasskeyUsed: Date;
    };
    twoFA: {
      enabled: boolean;
      backupCodes: Decipheriv[];
      secret: Decipheriv;
    };
    oauth: Oauth[];
  };
  role: Role;
  sessions?: ISession;

  isPasswordValid: (candidatePassword: string) => Promise<boolean>;
}
