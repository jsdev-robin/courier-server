import express, { Router } from 'express';
import { adminParcelController } from '../controllers/adminParcelController';
import { adminProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router.route('/:id').get(adminParcelController.findOneAndUpdateAssignAuto);

export default router;
