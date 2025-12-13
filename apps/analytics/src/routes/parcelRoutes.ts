import express, { Router } from 'express';
import { parcelController } from '../controllers/parcelController';
import { adminProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router.route('/payment-status-stats').get(parcelController.findStatusStats);
router.route('/payment-type-stats').get(parcelController.findPaymentTypeStats);
router.route('/overview-stats').get(parcelController.findOverviewStats);

export default router;
