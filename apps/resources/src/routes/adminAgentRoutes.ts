import express, { Router } from 'express';
import { adminAgentController } from '../controllers/adminAgentController';
import { adminProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router.route('/available').get(adminAgentController.findAvailable);
router.route('/agents').get(adminAgentController.find);

export default router;
