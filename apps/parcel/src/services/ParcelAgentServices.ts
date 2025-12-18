import { ApiError } from '@server/middlewares';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import mongoose, { Model } from 'mongoose';
import { ParcelStatus } from '../models/parcel/schemas/trackingHistorySchema';
import { IParcel } from '../models/parcel/types';

export class ParcelAgentServices {
  protected readonly model: Model<IParcel>;

  constructor(options: { model: Model<IParcel> }) {
    this.model = options.model;
  }

  public find: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const parcels = await this.model
        .aggregate([
          {
            $match: {
              assignedAgent: new mongoose.Types.ObjectId(req.self.id),
              status: { $ne: ParcelStatus.BOOKED },
            },
          },
          {
            $addFields: {
              nextStatuses: {
                $map: {
                  input: {
                    $filter: {
                      input: [
                        ParcelStatus.ASSIGNED,
                        ParcelStatus.PICKED_UP,
                        ParcelStatus.IN_TRANSIT,
                        ParcelStatus.DELIVERED,
                        ParcelStatus.FAILED,
                      ],
                      as: 'possibleStatus',
                      cond: {
                        $gt: [
                          {
                            $indexOfArray: [
                              [
                                ParcelStatus.BOOKED,
                                ParcelStatus.ASSIGNED,
                                ParcelStatus.PICKED_UP,
                                ParcelStatus.IN_TRANSIT,
                                ParcelStatus.DELIVERED,
                                ParcelStatus.FAILED,
                              ],
                              '$$possibleStatus',
                            ],
                          },
                          {
                            $indexOfArray: [
                              [
                                ParcelStatus.BOOKED,
                                ParcelStatus.ASSIGNED,
                                ParcelStatus.PICKED_UP,
                                ParcelStatus.IN_TRANSIT,
                                ParcelStatus.DELIVERED,
                                ParcelStatus.FAILED,
                              ],
                              '$status',
                            ],
                          },
                        ],
                      },
                    },
                  },
                  as: 'status',
                  in: { status: '$$status' },
                },
              },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'customer',
              foreignField: '_id',
              as: 'customerInfo',
            },
          },
          {
            $unwind: '$customerInfo',
          },
          {
            $lookup: {
              from: 'agents',
              localField: 'assignedAgent',
              foreignField: '_id',
              as: 'agentInfo',
            },
          },
          {
            $unwind: '$agentInfo',
          },
          {
            $project: {
              trackingNumber: 1,
              status: 1,
              deliveryAddress: 1,
              parcelDetails: 1,
              payment: 1,
              nextStatuses: 1,
              customer: {
                personalInfo: '$customerInfo.personalInfo',
                location: '$customerInfo.location',
              },
              agent: {
                // personalInfo: '$agentInfo.personalInfo',
                'location.coordinates': '$agentInfo.location.coordinates',
              },
            },
          },
        ])
        .skip(skip)
        .limit(limit);

      const total = await this.model.countDocuments({
        assignedAgent: new mongoose.Types.ObjectId(req.self.id),
        status: { $ne: ParcelStatus.BOOKED },
      });

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        data: {
          limit: 10,
          total: total,
          parcels,
        },
      });
    }
  );

  public findOneAndUpdateStatus: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { status } = req.body;

      const parcel = await this.model.findOneAndUpdate(
        {
          $and: [
            { trackingNumber: req.params.trackingNumber },
            { status: { $nin: ['Booked', 'Failed'] } },
            { assignedAgent: req.self.id },
          ],
        },
        {
          $set: { status },
          $push: {
            trackingHistory: {
              status,
              timestamp: new Date(),
              notes: `Status updated to ${status}`,
            },
          },
        },
        {
          writeConcern: { w: 'majority', j: true, wtimeout: 5000 },
          new: true,
        }
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
        message: 'Parcel status has been updated successfully.',
      });
    }
  );
}
