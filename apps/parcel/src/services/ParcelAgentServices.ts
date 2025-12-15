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
      const parcels = await this.model.aggregate([
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
            'deliveryAddress.street': 1,
            'deliveryAddress.city': 1,
            'deliveryAddress.state': 1,
            'deliveryAddress.country': 1,
            'deliveryAddress.postalCode': 1,
            'deliveryAddress.coordinates': 1,
            'parcelDetails.size': 1,
            'payment.type': 1,
            'payment.status': 1,
            nextStatuses: 1,
            customer: {
              personalInfo: '$customerInfo.personalInfo',
              location: '$customerInfo.location',
            },
            agent: {
              // personalInfo: '$agentInfo.personalInfo',
              location: '$agentInfo.location',
            },
          },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        data: {
          parcels,
        },
      });
    }
  );

  public findOneAndUpdateStatus: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      console.log(req.body);

      const parcel = await this.model.findOneAndUpdate(
        {
          $and: [
            { trackingNumber: req.params.trackingNumber },
            {
              status: {
                $nin: ['Booked', 'Failed'],
              },
            },
            { assignedAgent: req.self.id },
          ],
        },
        {
          $set: {
            status: req.body.status,
          },
        },
        {
          writeConcern: {
            w: 'majority',
            j: true,
            wtimeout: 5000,
          },
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
