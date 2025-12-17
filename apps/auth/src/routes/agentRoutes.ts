import { validationRequest } from '@server/validations';
import express, { Router } from 'express';
import multer from 'multer';
import { config } from '../configs/configs';
import {
  agentAuthController,
  protect,
} from '../controllers/agentAuthController';
import { OnboardingServices } from '../services/onboarding/OnboardingServices';
import { authValidations } from '../validations/authValidations';

const upload = multer({ storage: multer.memoryStorage() });

const router: Router = express.Router();

// ============================== Public Routes ==========================

router.post(
  '/signup',
  authValidations.signup,
  validationRequest,
  OnboardingServices.checkInvited,
  agentAuthController.signup
);

router.post(
  '/signup/verify',
  authValidations.verify,
  validationRequest,
  agentAuthController.verify
);

router.post(
  '/signin',
  authValidations.signin,
  validationRequest,
  agentAuthController.signin,
  agentAuthController.createSession
);

router.post('/refresh-token', agentAuthController.refreshToken);

// Two-Factor Authentication (Sign-in)
router.post(
  '/authentication/start',
  authValidations.startAuthentication,
  validationRequest,
  agentAuthController.startAuthentication
);

router.post(
  '/authentication/finish',
  agentAuthController.finishAuthentication(config.AGENT_CLIENT_URL),
  agentAuthController.createSession
);

// Password Reset
router.post(
  '/password/reset/start',
  authValidations.isEmail,
  validationRequest,
  agentAuthController.startPasswordReset(config.AGENT_CLIENT_URL)
);
router.patch(
  '/password/reset/finish/:token',
  authValidations.finishPasswordReset,
  validationRequest,
  agentAuthController.finishPasswordReset
);

// 2FA Verification
router.post(
  '/2fa/verify/app',
  authValidations.verify2FASignIn,
  validationRequest,
  agentAuthController.verify2FASignIn,
  agentAuthController.createSession
);

router.post(
  '/2fa/verify/recovery',
  authValidations.verifyBackupCode,
  validationRequest,
  agentAuthController.verifyBackupCode,
  agentAuthController.createSession
);

// ============================== Protected Routes =======================
router.use(
  protect.validateToken,
  protect.requireAuth,
  protect.restrictTo('agent')
);

// Session Management
router.post('/signout', agentAuthController.signout);
router.post(
  '/signout/:token',
  authValidations.token,
  validationRequest,
  agentAuthController.signoutSession
);
router.post('/signout-all', agentAuthController.signoutAllSession);

// Profile
router
  .route('/profile')
  .get(agentAuthController.getProfile)
  .patch(
    upload.single('img'),
    authValidations.updateProfile,
    validationRequest,
    agentAuthController.updateProfile
  );

router.get('/sessions', agentAuthController.sessions);

// Registration
router.post('/registration/start', agentAuthController.startRegistration);
router.post(
  '/registration/finish',
  authValidations.finishRegistration,
  validationRequest,
  agentAuthController.finishRegistration(config.AGENT_CLIENT_URL)
);

// Passkeys
router.get('/passkeys', agentAuthController.spyPasskeys);
router.delete(
  '/passkeys/:id',
  authValidations.id,
  validationRequest,
  agentAuthController.unregisterPasskey
);

// Password Change
router.patch(
  '/password/change',
  authValidations.changePassword,
  validationRequest,
  agentAuthController.changePassword
);

// 2FA Setup
router.get('/2fa/setup/start', agentAuthController.start2FASetup);
router.patch(
  '/2fa/setup/finish',
  authValidations.finish2FASetup,
  validationRequest,
  agentAuthController.finish2FASetup
);

router.patch('/2fa/remove', agentAuthController.remove2FA);

// 2FA Backup Codes
router.post(
  '/2fa/backup-codes/generate',
  agentAuthController.startBackupCodesSetup
);
router.get('/2fa/backup-codes/recover', agentAuthController.recoverBackupCodes);
router.post('/2fa/backup-codes/use', agentAuthController.verifyBackupCode);

// Email Change
router.post(
  '/email/change/start',
  authValidations.startEmailChange,
  validationRequest,
  agentAuthController.startEmailChange(
    `${config.AGENT_CLIENT_URL}/account/workflow/sessions/email-change`
  )
);
router.patch(
  '/email/change/finish/:token',
  authValidations.finishEmailChange,
  validationRequest,
  agentAuthController.finishEmailChange
);

router.patch(
  '/disconnect/oauth',
  authValidations.disconnectOauth,
  validationRequest,
  agentAuthController.disconnectOauth
);

export default router;
