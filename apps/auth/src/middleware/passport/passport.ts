import passport from 'passport';
import {
  Profile as GitHubProfile,
  Strategy as GitHubStrategy,
} from 'passport-github2';
import {
  Profile as GoogleProfile,
  Strategy as GoogleStrategy,
  VerifyCallback as GoogleVerifyCallback,
} from 'passport-google-oauth20';

import {
  Profile as FacebookProfile,
  Strategy as FacebookStrategy,
} from 'passport-facebook';

import {
  Profile as TwitterProfile,
  Strategy as TwitterStrategy,
} from 'passport-twitter';

import {
  Profile as DiscordProfile,
  Strategy as DiscordStrategy,
} from 'passport-discord';
import { config } from '../../configs/configs';

const strategiesConfig = {
  google: {
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: `${config.AUTH_SERVER_ORIGIN}/api/v1/auth/oauth/google/callback`,
    scope: ['profile', 'email'],
  },
  github: {
    clientID: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
    callbackURL: `${config.AUTH_SERVER_ORIGIN}/api/v1/auth/oauth/github/callback`,
    scope: ['profile', 'email'],
  },
  facebook: {
    clientID: config.FACEBOOK_CLIENT_ID,
    clientSecret: config.FACEBOOK_CLIENT_SECRET,
    callbackURL: `${config.AUTH_SERVER_ORIGIN}/api/v1/auth/oauth/facebook/callback`,
    profileFields: ['id', 'displayName', 'photos', 'email'],
  },
  twitter: {
    consumerKey: config.CONSUMER_KEY,
    consumerSecret: config.CONSUMER_SECRET,
    callbackURL: `${config.AUTH_SERVER_ORIGIN}/api/v1/auth/oauth/twitter/callback`,
    profileFields: ['id', 'displayName', 'photos', 'email', 'profile'],
    includeEmail: true,
  },
  discord: {
    clientID: config.DISCORD_CLIENT_ID,
    clientSecret: config.DISCORD_CLIENT_SECRET,
    callbackURL: `${config.AUTH_SERVER_ORIGIN}/api/v1/auth/oauth/discord/callback`,
    scope: ['identify', 'email'],
  },
};

const handleOAuth = async (
  accessToken: string,
  refreshToken: string,
  profile:
    | GoogleProfile
    | GitHubProfile
    | FacebookProfile
    | TwitterProfile
    | DiscordProfile,
  done: GoogleVerifyCallback
): Promise<void> => {
  return done(null, profile);
};

export const initializePassport = (): void => {
  passport.use(new GoogleStrategy(strategiesConfig.google, handleOAuth));
  passport.use(new GitHubStrategy(strategiesConfig.github, handleOAuth));
  passport.use(new FacebookStrategy(strategiesConfig.facebook, handleOAuth));
  passport.use(new TwitterStrategy(strategiesConfig.twitter, handleOAuth));
  passport.use(new DiscordStrategy(strategiesConfig.discord, handleOAuth));
};
