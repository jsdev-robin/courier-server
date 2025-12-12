import { param } from 'express-validator';

export const validation = {
  id: [
    param('id')
      .trim()
      .notEmpty()
      .withMessage('ID is required')
      .isMongoId()
      .withMessage('Invalid ID format'),
  ],

  slug: [
    param('slug')
      .trim()
      .notEmpty()
      .withMessage('Slug is required')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must be lowercase letters, numbers, or hyphens only'),
  ],

  publicId: [
    param('publicId')
      .trim()
      .notEmpty()
      .withMessage('Public ID is required')
      .matches(/^(?!.*\/\/)(?!.*\/$)[a-zA-Z0-9-_/]+$/)
      .withMessage(
        'Invalid Cloudinary Public ID. Only letters, numbers, "-", "_", and "/" allowed. No trailing or double slashes.'
      ),
  ],
};
