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

router.route('/').get(adminParcelController.find);
router
  .route('/:id')
  .all(validation.id)
  .get(validationRequest, adminParcelController.findById);

router.route('/geo-near').get(adminParcelController.findGeoNear);

router
  .route('/:id/auto')
  .all(validation.id)
  .patch(validationRequest, adminParcelController.findOneAndUpdateAssignAuto);

router
  .route('/:id/:agentId')
  .all([...validation.id, ...validation.agentId])
  .patch(validationRequest, adminParcelController.findOneAndUpdateAssign);

export default router;
