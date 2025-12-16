import { validation, validationRequest } from '@server/validations';
import express, { Router } from 'express';
import { customerParcelController } from '../controllers/customerParcelController';
import { userProtect } from '../controllers/protectController';
import { parcelValidator } from '../validations/parcelValidator';

const router: Router = express.Router();

router.use(
  userProtect.validateToken,
  userProtect.requireAuth,
  userProtect.restrictTo('user')
);

router.route('/many').post(customerParcelController.createMany);

router
  .route('/')
  .post(
    parcelValidator.create,
    validationRequest,
    customerParcelController.create
  )
  .get(customerParcelController.find);

router
  .route('/:id')
  .get(validation.id, validationRequest, customerParcelController.findOne);

export default router;
