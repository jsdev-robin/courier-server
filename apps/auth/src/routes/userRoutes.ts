import { validationRequest } from '@server/validations';
import express, { Router } from 'express';
import multer from 'multer';
import { config } from '../configs/configs';
import { protect, userAuthController } from '../controllers/userAuthController';
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

router.patch(
  '/disconnect/oauth',
  authValidations.disconnectOauth,
  validationRequest,
  userAuthController.disconnectOauth
);

export default router;
