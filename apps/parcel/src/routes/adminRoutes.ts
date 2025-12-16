import { validation, validationRequest } from '@server/validations';
import express, { Router } from 'express';
import { adminParcelController } from '../controllers/adminParcelController';
import { adminProtect } from '../controllers/protectController';

const router: Router = express.Router();

router.use(
  adminProtect.validateToken,
  adminProtect.requireAuth,
  adminProtect.restrictTo('admin')
);

router.get('/parcel/export/pdf/:id', adminParcelController.findOneAndExportPdf);
router.get('/csv', adminParcelController.findAllExportExcel);

router.route('/').get(adminParcelController.find);
router
  .route('/:id')
  .all(validation.id)
  .get(validationRequest, adminParcelController.findById);

export default router;
