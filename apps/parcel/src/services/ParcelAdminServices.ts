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
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const parcelId = req.params.id;

      const result = await this.model.aggregate([
        {
          $match: {
            $and: [{ _id: new Types.ObjectId(parcelId) }, { status: 'Booked' }],
          },
        },
        {
          $lookup: {
            from: 'agents',
            let: { pickupCoord: '$pickupAddress.coordinates' },
            pipeline: [
              { $match: { status: 'available' } },
              {
                $addFields: {
                  distance: {
                    $geoNear: {
                      near: {
                        type: 'Point',
                        coordinates: ['$$pickupCoord.lng', '$$pickupCoord.lat'],
                      },
                      distanceField: 'distance',
                      spherical: true,
                    },
                  },
                },
              },
              { $sort: { distance: 1 } },
              { $limit: 1 },
            ],
            as: 'nearestAgent',
          },
        },
        { $unwind: '$nearestAgent' },
        {
          $set: {
            assignedAgent: '$nearestAgent._id',
            status: 'ASSIGNED',
          },
        },
      ]);

      if (!result.length) {
        return next(
          new ApiError(
            'Parcel not found or no available agent nearby.',
            HttpStatusCode.NOT_FOUND
          )
        );
      }

      await this.model.updateOne(
        { _id: new Types.ObjectId(parcelId) },
        { $set: { assignedAgent: result[0].assignedAgent, status: 'Assigned' } }
      );

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Parcel has been auto-assigned successfully.',
        data: { parcel: result[0] },
      });
    }
  );
}
