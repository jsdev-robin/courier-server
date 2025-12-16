import { IUser } from '@server/types';
import { compare, hash } from 'bcryptjs';
import { model, Model, Schema } from 'mongoose';
import { SessionSchema } from './schemas/sessionSchema.js';

const TeamMemberSchema = new Schema<IUser>(
  {
    personalInfo: {
      familyName: { type: String },
      givenName: { type: String },
      email: { type: String, unique: true },
      phone: { type: String },
      address: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        coordinates: [String],
      },
    },

    authentication: {
      password: { type: String, select: false },
      isVerified: { type: Boolean, default: false },
      passKeys: {
        hasPasskeys: { type: Boolean, default: false },
        passkeyCount: { type: Number, default: 0 },
        lastPasskeyUsed: { type: Date },
      },
      twoFA: {
        enabled: { type: Boolean, default: false },
        backupCodes: {
          type: [
            {
              salt: { type: String, required: true, select: false },
              iv: { type: String, required: true, select: false },
              data: { type: String, required: true, select: false },
            },
          ],
          select: false,
          _id: false,
        },
        secret: {
          type: {
            salt: { type: String },
            iv: { type: String },
            data: { type: String },
          },
          select: false,
          _id: false,
        },
      },

      oauth: {
        type: [
          {
            _id: false,
            provider: {
              type: String,
              enum: [
                'jwt',
                'google',
                'github',
                'twitter',
                'facebook',
                'discord',
                'linkedin',
              ],
              default: 'jwt',
            },
            email: { type: String },
            _raw: { type: Schema.Types.Mixed, select: false },
          },
        ],
        default: [],
      },
    },
    role: {
      type: String,
      default: 'admin',
      required: true,
      immutable: true,
    },
    sessions: {
      type: [SessionSchema],
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_, ret: unknown) {
        const r = ret as {
          authentication?: { password?: string };
        };
        delete r.authentication?.password;
        return r;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform(_, ret: unknown) {
        const r = ret as {
          authentication?: { password?: string };
        };
        delete r.authentication?.password;
        return r;
      },
    },
  }
);

TeamMemberSchema.virtual('personalInfo.displayName').get(function (
  this: IUser
) {
  return `${this.personalInfo.familyName} ${this.personalInfo.givenName}`.trim();
});

TeamMemberSchema.pre<IUser>('save', async function () {
  if (!this.isModified('authentication.password')) return;
  this.authentication.password = await hash(
    String(this.authentication.password),
    12
  );
});

TeamMemberSchema.methods.isPasswordValid = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return await compare(candidatePassword, this.authentication.password ?? '');
};

export const TeamMember: Model<IUser> = model<IUser>(
  'TeamMember',
  TeamMemberSchema
);
