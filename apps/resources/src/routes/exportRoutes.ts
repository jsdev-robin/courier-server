import { validation, validationRequest } from '@server/validations';
import express, { Router } from 'express';
import { exportController } from '../controllers/exportController';
import { adminProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router
  .route('/invoice/:id')
  .all(validation.id)
  .get(validationRequest, exportController.findOneAndExportInvoice);

router.route('/excel').get(exportController.findAllExportExcel);

export default router;
