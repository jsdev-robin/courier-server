import { validation, validationRequest } from '@server/validations';
import express, { Router } from 'express';
import { adminParcelController } from '../controllers/adminParcelController';
import { adminProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router.route('/near').get(adminParcelController.findNear);
router.route('/').get(adminParcelController.find);
router
  .route('/:id')
  .all(validation.id)
  .get(validationRequest, adminParcelController.findById);

router
  .route('/:id/:agentId')
  .all([...validation.id, ...validation.agentId])
  .patch(validationRequest, adminParcelController.findOneAndUpdateAssign);

export default router;
