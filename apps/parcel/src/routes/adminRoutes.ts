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

router.route('/geo-near').get(adminParcelController.findGeoNear);

router
  .route('/:id/:agentId')
  .all([...validation.id, ...validation.agentId])
  .get(validationRequest, adminParcelController.findOneAndUpdateAssign);

router
  .route('/:id/auto')
  .all(validation.id)
  .get(validationRequest, adminParcelController.findOneAndUpdateAssignAuto);

export default router;
