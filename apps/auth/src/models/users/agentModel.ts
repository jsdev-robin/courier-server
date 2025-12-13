import { IUser } from '@server/types';
import { compare, hash } from 'bcryptjs';
import { model, Model, Schema } from 'mongoose';
import { coordinatesSchema } from './schemas/coordinatesSchema.js';
import { SessionSchema } from './schemas/sessionSchema.js';

const AgentSchema = new Schema<IUser>(
  {
    personalInfo: {
      familyName: { type: String },
      givenName: { type: String },
      email: { type: String, unique: true },
      phone: { type: String },
      dateOfBirth: { type: Date },
      gender: {
        type: String,
        enum: ['male', 'female', 'other', ''],
        default: '',
      },
      nationality: { type: String },
      address: { type: String },
      avatar: {
        public_id: { type: String },
        url: { type: String },
      },
      socialLinks: {
        facebook: String,
        twitter: String,
        instagram: String,
        youtube: String,
      },
      emergencyContacts: {
        type: [
          {
            name: { type: String },
            phone: { type: String },
            relation: { type: String },
          },
        ],
        select: false,
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
    location: { type: coordinatesSchema },
    role: {
      type: String,
      default: 'agent',
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

AgentSchema.virtual('personalInfo.displayName').get(function (this: IUser) {
  return `${this.personalInfo.familyName} ${this.personalInfo.givenName}`.trim();
});

AgentSchema.pre<IUser>('save', async function () {
  if (!this.isModified('authentication.password')) return;
  this.authentication.password = await hash(
    String(this.authentication.password),
    12
  );
});

AgentSchema.methods.isPasswordValid = async function (
  this: IUser,
  candidatePassword: string
): Promise<boolean> {
  return await compare(candidatePassword, this.authentication.password ?? '');
};

export const Agent: Model<IUser> = model<IUser>('Agent', AgentSchema);
