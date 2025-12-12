import { Crypto } from '@server/security';
import { Document, Schema, model } from 'mongoose';

export interface PasswordForgot extends Document {
  userId: string;
  token: string;
  createdAt: Date;
  passwordChangedAt?: Date;
  passwordResetExpires?: Date;
  createResetToken: (id: string) => string;
}

const passwordForgotSchema = new Schema<PasswordForgot>({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  passwordChangedAt: {
    type: Date,
    select: false,
  },
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

passwordForgotSchema.methods.createResetToken = function (id: string) {
  const resetToken = Crypto.randomHexString();
  this.token = Crypto.hash(resetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  this.userId = id;
  return resetToken;
};

export const PasswordForgotModel = model<PasswordForgot>(
  'PasswordForgot',
  passwordForgotSchema
);
