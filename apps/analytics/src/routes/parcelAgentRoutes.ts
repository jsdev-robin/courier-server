import express, { Router } from 'express';
import { parcelAgentController } from '../controllers/parcelController';
import { agentProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  agentProtect.validateToken,
  agentProtect.requireAuth,
  agentProtect.restrictTo('agent')
);

router.route('/metrics/stats').get(parcelAgentController.findStatsMetrics);
router.route('/metrics/performance').get(parcelAgentController.findPerformance);
router.route('/metrics/locations').get(parcelAgentController.findMapMetrics);
router
  .route('/metrics/today/status/distribution')
  .get(parcelAgentController.findTodayStatusDistributionMetrics);

export default router;
