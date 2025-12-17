import express, { Router } from 'express';
import { parcelAdminController } from '../controllers/parcelController';
import { adminProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router.route('/metrics/stats').get(parcelAdminController.findStatsMetrics);
router
  .route('/metrics/status-distribution')
  .get(parcelAdminController.findStatusDistributionMetrics);
router
  .route('metrics/size-distribution')
  .get(parcelAdminController.findSizeDistributionMetrics);
router
  .route('metrics/agents')
  .get(parcelAdminController.findTopPerformingAgentsMetrics);
router.route('/metrics/locations').get(parcelAdminController.findMapMetrics);
router.route('/metrics/revenue').get(parcelAdminController.findRevenueMetrics);
router.route('/metrics/status').get(parcelAdminController.findStatusMetrics);
router
  .route('/metrics/success-rate')
  .get(parcelAdminController.findSuccessRateMetrics);
router.route('/metrics/cod').get(parcelAdminController.findCODMetrics);

router
  .route('/metrics/last7days/parcel')
  .get(parcelAdminController.findParcelLast7Days);

router
  .route('/metrics/last7days/prepaid')
  .get(parcelAdminController.findPrepaidLast7Days);

router
  .route('/metrics/last7days/cod')
  .get(parcelAdminController.findCodLast7Days);

router
  .route('/metrics/last7days/success')
  .get(parcelAdminController.findSuccessRateLast7Days);

router
  .route('/metrics/last7days')
  .get(parcelAdminController.findLast7DaysMetrics);

// Current Date
router
  .route('/metrics/today/status/distribution')
  .get(parcelAdminController.findTodayStatusDistributionMetrics);

router
  .route('/metrics/today/payment/distribution')
  .get(parcelAdminController.findTodayPaymentDistributionMetrics);

export default router;
