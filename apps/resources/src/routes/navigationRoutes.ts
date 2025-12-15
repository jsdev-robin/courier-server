import express, { Router } from 'express';
import { agentProtect } from '../controllers/protectController';
import { NavigationServices } from '../services/navigation/NavigationServices';

const router: Router = express.Router();

router.use(
  agentProtect.validateToken,
  agentProtect.requireAuth,
  agentProtect.restrictTo('agent')
);

router.route('/navigate').get(NavigationServices.FindNavigate);
router.route('/duration').get(NavigationServices.FindDuration);

export default router;
