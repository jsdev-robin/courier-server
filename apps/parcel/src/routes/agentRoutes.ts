import { validationRequest } from '@server/validations';
import express, { Router } from 'express';
import { agentParcelController } from '../controllers/agentParcelController';
import { agentProtect } from '../controllers/protectController';
import { parcelValidator } from '../validations/parcelValidator';

const router: Router = express.Router();

router.use(
  agentProtect.validateToken,
  agentProtect.requireAuth,
  agentProtect.restrictTo('agent')
);

router.route('/').get(agentParcelController.find);
router
  .route('/:trackingNumber')
  .all(parcelValidator.trackingNumber)
  .patch(
    parcelValidator.status,
    validationRequest,
    agentParcelController.findOneAndUpdateStatus
  );

export default router;
