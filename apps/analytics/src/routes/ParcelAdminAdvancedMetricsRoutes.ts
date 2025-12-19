import express, { Router } from 'express';
import { adminProtect } from '../controllers/protectController';
import { ParcelAdminAdvancedMetrics } from '../services/parcel/ParcelAdminAdvancedMetrics';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router.route('/payment').get(ParcelAdminAdvancedMetrics.findPaymentTypeMetrics);
router
  .route('/status/distribution')
  .get(ParcelAdminAdvancedMetrics.findStatusDistributionMetrics);

router
  .route('/status/monthly')
  .get(ParcelAdminAdvancedMetrics.findStatusMonthlyMetrics);

router
  .route('/profit/monthly')
  .get(ParcelAdminAdvancedMetrics.findProfitLossMonthlyMetrics);

router
  .route('/profit/lose')
  .get(ParcelAdminAdvancedMetrics.findProfitLossMetrics);

export default router;
