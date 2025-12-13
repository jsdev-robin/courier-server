import { nodeClient } from '@server/cloud';
import { ApiError } from '@server/middlewares';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Model, Types } from 'mongoose';
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
        {
          $set: {
            assignedAgent: new Types.ObjectId(req.params.agentId),
            status: 'Assigned',
          },
        },
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
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const parcel = await this.model
        .findOne({
          $and: [{ _id: req.params.id }, { status: 'Booked' }],
        })
        .lean();

      if (!parcel) {
        return next(
          new ApiError(
            'Parcel not found with the given ID or already assigned',
            HttpStatusCode.NOT_FOUND
          )
        );
      }

      const user = await nodeClient.geoSearch(
        'agent/location',
        {
          longitude: parcel.deliveryAddress?.coordinates?.lng,
          latitude: parcel.deliveryAddress?.coordinates?.lat,
        },
        { radius: 1000, unit: 'm' },
        {
          SORT: 'ASC',
          COUNT: { value: 1 },
        }
      );

      const agentId = user[0];

      if (!agentId) {
        return next(
          new ApiError('No nearby agent found', HttpStatusCode.NOT_FOUND)
        );
      }

      parcel.assignedAgent = new Types.ObjectId(agentId);
      parcel.status = 'Assigned';
      await parcel.save();

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Parcel has been auto-assigned successfully.',
      });
    }
  );
}
