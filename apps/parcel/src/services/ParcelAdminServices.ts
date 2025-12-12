import { nodeClient } from '@server/cloud';
import { ApiError } from '@server/middlewares';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Model } from 'mongoose';
import { IParcel } from '../models/parcel/types';

export class ParcelAdminServices {
  protected readonly model: Model<IParcel>;

  constructor(options: { model: Model<IParcel> }) {
    this.model = options.model;
  }

  public findOneAndUpdateAssign: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const parcel = await this.model.findOneAndUpdate(
        {
          $and: [{ _id: req.params.id }, { status: 'Booked' }],
        },
        { $set: { assignedAgent: req.body.agentId, status: 'ASSIGNED' } },
        { new: true }
      );

      if (!parcel) {
        return next(
          new ApiError(
            'Parcel not found with the given ID or already assigned',
            HttpStatusCode.NOT_FOUND
          )
        );
      }

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Parcel has been assigned successfully.',
        data: { parcel },
      });
    }
  );

  public findOneAndUpdateAssignAuto: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const user = await nodeClient.geoSearch(
        'agent/location',
        { longitude: 90.01955619163091, latitude: 23.834249431330473 },
        { radius: 1000, unit: 'm' },
        {
          SORT: 'ASC',
          COUNT: { value: 1 },
        }
      );

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Parcel has been auto-assigned successfully.',
        user,
      });
    }
  );
}
