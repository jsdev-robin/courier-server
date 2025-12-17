import { validationRequest } from '@server/validations';
import express, { Router } from 'express';
import multer from 'multer';
import { config } from '../configs/configs';
import {
  adminAuthController,
  adminProtect,
} from '../controllers/adminAuthController';
import { OnboardingServices } from '../services/onboarding/OnboardingServices';
import { authValidations } from '../validations/authValidations';

const upload = multer({ storage: multer.memoryStorage() });

const router: Router = express.Router();

// ============================== Public Routes ==========================
router.post(
  '/signin',
  authValidations.signin,
  validationRequest,
  adminAuthController.signin,
  adminAuthController.createSession
);

router.post('/refresh-token', adminAuthController.refreshToken);

// Two-Factor Authentication (Sign-in)
router.post(
  '/authentication/start',
  authValidations.startAuthentication,
  validationRequest,
  adminAuthController.startAuthentication
);

router.post(
  '/authentication/finish',
  adminAuthController.finishAuthentication(config.AGENT_CLIENT_URL),
  adminAuthController.createSession
);

// Password Reset
router.post(
  '/password/reset/start',
  authValidations.isEmail,
  validationRequest,
  adminAuthController.startPasswordReset(config.AGENT_CLIENT_URL)
);
router.patch(
  '/password/reset/finish/:token',
  authValidations.finishPasswordReset,
  validationRequest,
  adminAuthController.finishPasswordReset
);

// 2FA Verification
router.post(
  '/2fa/verify/app',
  authValidations.verify2FASignIn,
  validationRequest,
  adminAuthController.verify2FASignIn,
  adminAuthController.createSession
);

router.post(
  '/2fa/verify/recovery',
  authValidations.verifyBackupCode,
  validationRequest,
  adminAuthController.verifyBackupCode,
  adminAuthController.createSession
);

// ============================== Protected Routes =======================
router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

// Session Management
router.post('/signout', adminAuthController.signout);
router.post(
  '/signout/:token',
  authValidations.token,
  validationRequest,
  adminAuthController.signoutSession
);
router.post('/signout-all', adminAuthController.signoutAllSession);

// Profile
router
  .route('/profile')
  .get(adminAuthController.getProfile)
  .patch(
    upload.single('img'),
    authValidations.updateProfile,
    validationRequest,
    adminAuthController.updateProfile
  );

router.get('/sessions', adminAuthController.sessions);

// Registration
router.post('/registration/start', adminAuthController.startRegistration);
router.post(
  '/registration/finish',
  authValidations.finishRegistration,
  validationRequest,
  adminAuthController.finishRegistration(config.AGENT_CLIENT_URL)
);

// Passkeys
router.get('/passkeys', adminAuthController.spyPasskeys);
router.delete(
  '/passkeys/:id',
  authValidations.id,
  validationRequest,
  adminAuthController.unregisterPasskey
);

// Password Change
router.patch(
  '/password/change',
  authValidations.changePassword,
  validationRequest,
  adminAuthController.changePassword
);

// 2FA Setup
router.get('/2fa/setup/start', adminAuthController.start2FASetup);
router.patch(
  '/2fa/setup/finish',
  authValidations.finish2FASetup,
  validationRequest,
  adminAuthController.finish2FASetup
);

router.patch('/2fa/remove', adminAuthController.remove2FA);

// 2FA Backup Codes
router.post(
  '/2fa/backup-codes/generate',
  adminAuthController.startBackupCodesSetup
);
router.get('/2fa/backup-codes/recover', adminAuthController.recoverBackupCodes);
router.post('/2fa/backup-codes/use', adminAuthController.verifyBackupCode);

// Email Change
router.post(
  '/email/change/start',
  authValidations.startEmailChange,
  validationRequest,
  adminAuthController.startEmailChange(
    `${config.AGENT_CLIENT_URL}/account/workflow/sessions/email-change`
  )
);
router.patch(
  '/email/change/finish/:token',
  authValidations.finishEmailChange,
  validationRequest,
  adminAuthController.finishEmailChange
);

router.post(
  '/invite',
  authValidations.isEmail,
  validationRequest,
  OnboardingServices.invite
);

export default router;
