import { normalizeRequestBody } from '@server/middlewares';
import { validationRequest } from '@server/validations';
import express, { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { config } from '../configs/configs';
import { protect, userAuthController } from '../controllers/userAuthController';
import { socialAuthProvider } from '../middleware/socialAuthProvider';
import { authValidations } from '../validations/authValidations';

const upload = multer({ storage: multer.memoryStorage() });

const router: Router = express.Router();

// ============================== Public Routes ==========================
router.post(
  '/signup',
  authValidations.signup,
  validationRequest,
  userAuthController.signup
);
router.post(
  '/signup/verify',
  authValidations.verify,
  validationRequest,
  userAuthController.verify
);

router.post(
  '/signin',
  authValidations.signin,
  validationRequest,
  userAuthController.signin,
  userAuthController.createSession
);

router.post('/refresh-token', userAuthController.refreshToken);

// Two-Factor Authentication (Sign-in)
router.post(
  '/authentication/start',
  authValidations.startAuthentication,
  validationRequest,
  userAuthController.startAuthentication
);

router.post(
  '/authentication/finish',
  userAuthController.finishAuthentication(config.AGENT_CLIENT_URL),
  userAuthController.createSession
);

// Password Reset
router.post(
  '/password/reset/start',
  authValidations.isEmail,
  validationRequest,
  userAuthController.startPasswordReset(config.AGENT_CLIENT_URL)
);
router.patch(
  '/password/reset/finish/:token',
  authValidations.finishPasswordReset,
  validationRequest,
  userAuthController.finishPasswordReset
);

// 2FA Verification
router.post(
  '/2fa/verify/app',
  authValidations.verify2FASignIn,
  validationRequest,
  userAuthController.verify2FASignIn,
  userAuthController.createSession
);

router.post(
  '/2fa/verify/recovery',
  authValidations.verifyBackupCode,
  validationRequest,
  userAuthController.verifyBackupCode,
  userAuthController.createSession
);

// Social Login
router.get('/google', socialAuthProvider('google', 'user'));
router.get('/github', socialAuthProvider('github', 'user'));
router.get('/facebook', socialAuthProvider('facebook', 'user'));
router.get('/twitter', socialAuthProvider('twitter', 'user'));
router.get('/discord', socialAuthProvider('discord', 'user'));

// ============================== Protected Routes =======================
router.use(
  protect.validateToken,
  protect.requireAuth,
  protect.restrictTo('user')
);

// Session Management
router.post('/signout', userAuthController.signout);
router.post(
  '/signout/:token',
  authValidations.token,
  validationRequest,
  userAuthController.signoutSession
);
router.post('/signout-all', userAuthController.signoutAllSession);

// Profile
router
  .route('/profile')
  .get(userAuthController.getProfile)
  .patch(
    upload.single('img'),
    normalizeRequestBody,
    authValidations.updateProfile,
    validationRequest,
    userAuthController.updateProfile
  );

router.get('/sessions', userAuthController.sessions);

// Registration
router.post('/registration/start', userAuthController.startRegistration);
router.post(
  '/registration/finish',
  authValidations.finishRegistration,
  validationRequest,
  userAuthController.finishRegistration(config.AGENT_CLIENT_URL)
);

// Passkeys
router.get('/passkeys', userAuthController.spyPasskeys);
router.delete(
  '/passkeys/:id',
  authValidations.id,
  validationRequest,
  userAuthController.unregisterPasskey
);

// Password Change
router.patch(
  '/password/change',
  authValidations.changePassword,
  validationRequest,
  userAuthController.changePassword
);

// 2FA Setup
router.get('/2fa/setup/start', userAuthController.start2FASetup);
router.patch(
  '/2fa/setup/finish',
  authValidations.finish2FASetup,
  validationRequest,
  userAuthController.finish2FASetup
);

router.patch('/2fa/remove', userAuthController.remove2FA);

// 2FA Backup Codes
router.post(
  '/2fa/backup-codes/generate',
  userAuthController.startBackupCodesSetup
);
router.get('/2fa/backup-codes/recover', userAuthController.recoverBackupCodes);
router.post('/2fa/backup-codes/use', userAuthController.verifyBackupCode);

// Email Change
router.post(
  '/email/change/start',
  authValidations.startEmailChange,
  validationRequest,
  userAuthController.startEmailChange(
    `${config.AGENT_CLIENT_URL}/account/workflow/sessions/email-change`
  )
);
router.patch(
  '/email/change/finish/:token',
  authValidations.finishEmailChange,
  validationRequest,
  userAuthController.finishEmailChange
);

router.get(
  '/connect/google',
  (req: Request, res: Response, next: NextFunction) => {
    socialAuthProvider('google', 'user', req.self.id)(req, res, next);
  }
);

router.get(
  '/connect/facebook',
  (req: Request, res: Response, next: NextFunction) => {
    socialAuthProvider('facebook', 'user', req.self.id)(req, res, next);
  }
);

router.get(
  '/connect/twitter',
  (req: Request, res: Response, next: NextFunction) => {
    socialAuthProvider('twitter', 'user', req.self.id)(req, res, next);
  }
);

router.get(
  '/connect/github',
  (req: Request, res: Response, next: NextFunction) => {
    socialAuthProvider('github', 'user', req.self.id)(req, res, next);
  }
);

router.get(
  '/connect/discord',
  (req: Request, res: Response, next: NextFunction) => {
    socialAuthProvider('discord', 'user', req.self.id)(req, res, next);
  }
);

router.patch(
  '/disconnect/oauth',
  authValidations.disconnectOauth,
  validationRequest,
  userAuthController.disconnectOauth
);

export default router;
