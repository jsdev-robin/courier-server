import { check, param } from 'express-validator';

export const authValidations = {
  signup: [
    check('familyName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ min: 2, max: 32 })
      .withMessage('Must be 2-32 characters')
      .custom(
        (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
      )
      .escape(),

    check('givenName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ min: 2, max: 32 })
      .withMessage('Must be 2-32 characters')
      .custom(
        (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
      )
      .escape(),

    check('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),

    check('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Must be at least 8 characters')
      .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/)
      .withMessage(
        'Must contain uppercase, lowercase, number, and special character'
      ),

    check('passwordConfirm')
      .notEmpty()
      .withMessage('Please confirm your password')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],

  verify: [
    check('otp')
      .notEmpty()
      .withMessage('Verification code is required')
      .isNumeric()
      .withMessage('Code must be numeric')
      .isLength({ min: 6, max: 6 })
      .withMessage('Must be 6 digits'),
    check('token').notEmpty().withMessage('Token is required'),
  ],

  signin: [
    check('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    check('password').notEmpty().withMessage('Password is required'),
    check('remember').optional().toBoolean(),
  ],

  finishPasswordReset: [
    param('token').trim().notEmpty().withMessage('Token is required'),
    check('newPassword')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Must be at least 8 characters')
      .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/)
      .withMessage(
        'Must contain uppercase, lowercase, number, and special character'
      ),

    check('confirmNewPassword')
      .notEmpty()
      .withMessage('Please confirm your password')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match'),
  ],

  changePassword: [
    check('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),

    check('newPassword')
      .notEmpty()
      .withMessage('New password is required')
      .isLength({ min: 8 })
      .withMessage('Must be at least 8 characters')
      .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/)
      .withMessage(
        'Must contain uppercase, lowercase, number, and special character'
      )
      .custom((value, { req }) => value !== req.body.currentPassword)
      .withMessage('New password must be different from current'),

    check('confirmNewPassword')
      .notEmpty()
      .withMessage('Please confirm your new password')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match'),
  ],

  finishRegistration: [
    check('credential.id')
      .exists({ checkFalsy: true })
      .withMessage('id is required')
      .isString()
      .withMessage('id must be a string')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('id must be a valid Base64URL string'),

    check('credential.rawId')
      .exists({ checkFalsy: true })
      .withMessage('rawId is required')
      .isString()
      .withMessage('rawId must be a string')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('rawId must be a valid Base64URL string'),

    check('credential.response')
      .exists({ checkFalsy: true })
      .withMessage('response is required')
      .isObject()
      .withMessage('response must be an object'),

    check('credential.response.clientDataJSON')
      .exists({ checkFalsy: true })
      .withMessage('clientDataJSON is required')
      .isString()
      .withMessage('clientDataJSON must be a string')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('clientDataJSON must be a valid Base64URL string'),

    check('credential.response.attestationObject')
      .exists({ checkFalsy: true })
      .withMessage('attestationObject is required')
      .isString()
      .withMessage('attestationObject must be a string')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('attestationObject must be a valid Base64URL string'),

    check('credential.authenticatorAttachment')
      .optional()
      .isIn(['platform', 'cross-platform'])
      .withMessage(
        'authenticatorAttachment must be "platform" or "cross-platform"'
      ),

    check('credential.clientExtensionResults')
      .exists()
      .withMessage('clientExtensionResults is required')
      .isObject()
      .withMessage('clientExtensionResults must be an object'),

    check('credential.type')
      .exists({ checkFalsy: true })
      .withMessage('type is required')
      .equals('public-key')
      .withMessage('type must be "public-key"'),
  ],

  startAuthentication: [
    check('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
  ],

  finishAuthentication: [
    check('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),

    check('credential.id')
      .exists({ checkFalsy: true })
      .withMessage('id is required')
      .isString()
      .withMessage('id must be a string')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('id must be a valid Base64URL string'),

    check('credential.rawId')
      .exists({ checkFalsy: true })
      .withMessage('rawId is required')
      .isString()
      .withMessage('rawId must be a string')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('rawId must be a valid Base64URL string'),

    check('credential.response')
      .exists({ checkFalsy: true })
      .withMessage('response is required')
      .isObject()
      .withMessage('response must be an object'),

    check('credential.response.clientDataJSON')
      .exists({ checkFalsy: true })
      .withMessage('clientDataJSON is required')
      .isString()
      .withMessage('clientDataJSON must be a string')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('clientDataJSON must be a valid Base64URL string'),

    check('credential.response.attestationObject')
      .exists({ checkFalsy: true })
      .withMessage('attestationObject is required')
      .isString()
      .withMessage('attestationObject must be a string')
      .matches(/^[A-Za-z0-9\-_]+$/)
      .withMessage('attestationObject must be a valid Base64URL string'),

    check('credential.authenticatorAttachment')
      .optional()
      .isIn(['platform', 'cross-platform'])
      .withMessage(
        'authenticatorAttachment must be "platform" or "cross-platform"'
      ),

    check('credential.clientExtensionResults')
      .exists()
      .withMessage('clientExtensionResults is required')
      .isObject()
      .withMessage('clientExtensionResults must be an object'),

    check('credential.type')
      .exists({ checkFalsy: true })
      .withMessage('type is required')
      .equals('public-key')
      .withMessage('type must be "public-key"'),
  ],

  finish2FASetup: [
    check('totp').trim().notEmpty().withMessage('TOTP is required'),
    check('secret').trim().notEmpty().withMessage('Secret is required'),
  ],

  updateProfile: [
    check('personalInfo.familyName')
      .optional()
      .isString()
      .withMessage('Family name must be a string'),
    check('personalInfo.givenName')
      .optional()
      .isString()
      .withMessage('Given name must be a string'),
    check('personalInfo.phone')
      .exists({ checkFalsy: true })
      .withMessage('Phone is required')
      .isMobilePhone(['bn-BD'] as const)
      .withMessage('Phone must be valid'),
    check('personalInfo.dateOfBirth')
      .exists({ checkFalsy: true })
      .withMessage('Date of birth is required')
      .isISO8601()
      .toDate()
      .withMessage('Date of birth must be valid'),
    check('personalInfo.gender')
      .notEmpty()
      .withMessage('Gender is required')
      .optional()
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),

    check('personalInfo.nationality')
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .withMessage('Nationality must be a string'),
    check('personalInfo.address')
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .withMessage('Address must be a string'),
    check('personalInfo.socialLinks.facebook')
      .optional({ nullable: true, checkFalsy: true })
      .isURL()
      .withMessage('Facebook must be a valid URL'),
    check('personalInfo.socialLinks.twitter')
      .optional({ nullable: true, checkFalsy: true })
      .isURL()
      .withMessage('Twitter must be a valid URL'),
    check('personalInfo.socialLinks.instagram')
      .optional({ nullable: true, checkFalsy: true })
      .isURL()
      .withMessage('Instagram must be a valid URL'),
    check('personalInfo.socialLinks.youtube')
      .optional({ nullable: true, checkFalsy: true })
      .isURL()
      .withMessage('Youtube must be a valid URL'),
    check('personalInfo.emergencyContacts')
      .optional({ nullable: true, checkFalsy: true })
      .isArray()
      .withMessage('Emergency contacts must be an array'),
  ],

  verifyBackupCode: [
    check('code').trim().notEmpty().withMessage('Backup code is required'),
  ],

  verify2FASignIn: [
    check('totp').trim().notEmpty().withMessage('TOTP is required'),
  ],

  startEmailChange: [
    check('newEmail')
      .trim()
      .notEmpty()
      .withMessage('New email is required')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),

    check('confirmEmail')
      .trim()
      .notEmpty()
      .withMessage('Please confirm your email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail()
      .custom((value, { req }) => value === req.body.newEmail)
      .withMessage('Emails do not match')
      .custom((value, { req }) => value !== req.self?.personalInfo.email)
      .withMessage('New email must be different from current email'),

    check('password')
      .notEmpty()
      .withMessage('Password is required for verification'),
  ],

  finishEmailChange: [
    check('code').trim().notEmpty().withMessage('Code is required'),
    param('token').trim().notEmpty().withMessage('Token is required'),
  ],

  disconnectOauth: [
    check('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),

    check('provider')
      .exists({ checkFalsy: true })
      .withMessage('Provider is required.')
      .isIn([
        'jwt',
        'google',
        'github',
        'twitter',
        'facebook',
        'discord',
        'linkedin',
        'x',
      ])
      .withMessage('Invalid provider.'),
  ],
  isEmail: [
    check('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
  ],
  token: [param('token').trim().notEmpty().withMessage('Token is required')],
  id: [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('ID is required')
      .isMongoId()
      .withMessage('Invalid ID format'),
  ],
};
