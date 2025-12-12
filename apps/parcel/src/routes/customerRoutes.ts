import express, { Router } from 'express';
import { customerParcelController } from '../controllers/customerParcelController';
import { userProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  userProtect.validateToken,
  userProtect.requireAuth,
  userProtect.restrictTo('user')
);

router.route('/').post(customerParcelController.create);

export default router;
