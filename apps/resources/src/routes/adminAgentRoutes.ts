import express, { Router } from 'express';
import { adminAgentController } from '../controllers/agentController';
import { adminProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router.route('/').get(adminAgentController.find);
router.route('/available').get(adminAgentController.findAvailable);

export default router;
