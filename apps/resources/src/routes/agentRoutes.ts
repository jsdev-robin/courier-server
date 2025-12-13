import express, { Router } from 'express';
import { agentController } from '../controllers/agentController';
import { adminProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router.route('/').get(agentController.findAvailable);

export default router;
