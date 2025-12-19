import { APIFeatures } from '@server/features';
import { ApiError } from '@server/middlewares';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Model } from 'mongoose';

import { Types } from 'mongoose';
import { IParcel } from '../models/parcel/types';

export class ParcelAdminServices {
  protected readonly model: Model<IParcel>;

  constructor(options: { model: Model<IParcel> }) {
    this.model = options.model;
  }

  public find: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      console.log(req.query);

      const features = await new APIFeatures<IParcel>(this.model, {
        ...req.query,
      })
        .filter()
        .paginate()
        .sort()
        .globalSearch(['basicInfo.title'])
        .limitFields('-qrCode')
        .populate({
          path: 'assignedAgent',
          select: 'personalInfo',
        })
        .populate({
          path: 'customer',
          select: 'personalInfo',
        });

      const { data, total } = await features.exec();

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'All product retrieved successfully',
        data: {
          total,
          data,
        },
      });
    }
  );

  public findById: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const parcel = await this.model
        .findById(req.params.id)
        .populate({
          path: 'assignedAgent',
          select: 'personalInfo',
        })
        .populate({
          path: 'customer',
          select: 'personalInfo',
        });
      if (!parcel) {
        return next(
          new ApiError(
            'Parcel not found with the given ID.',
            HttpStatusCode.NOT_FOUND
          )
        );
      }

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Parcel retrieved successfully.',
        data: { parcel },
      });
    }
  );

  public findNear: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const parcels = await this.model.aggregate([
        {
          $match: {
            status: 'Booked',
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $lookup: {
            from: 'agents',
            let: {
              parcelCoordinates: '$deliveryAddress.location.coordinates',
            },
            pipeline: [
              {
                $match: {
                  $or: [
                    {
                      $expr: {
                        $and: [
                          { $isArray: '$location.coordinates' },
                          { $eq: [{ $size: '$location.coordinates' }, 2] },
                        ],
                      },
                    },
                    {
                      $expr: {
                        $and: [
                          { $isArray: '$location.coordinates ' },
                          { $eq: [{ $size: '$location.coordinates ' }, 2] },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                $addFields: {
                  agentCoords: {
                    $cond: {
                      if: { $isArray: '$location.coordinates' },
                      then: '$location.coordinates',
                      else: '$location.coordinates ',
                    },
                  },
                },
              },
              {
                $addFields: {
                  distance: {
                    $sqrt: {
                      $add: [
                        {
                          $pow: [
                            {
                              $subtract: [
                                { $arrayElemAt: ['$$parcelCoordinates', 0] },
                                { $arrayElemAt: ['$agentCoords', 0] },
                              ],
                            },
                            2,
                          ],
                        },
                        {
                          $pow: [
                            {
                              $subtract: [
                                { $arrayElemAt: ['$$parcelCoordinates', 1] },
                                { $arrayElemAt: ['$agentCoords', 1] },
                              ],
                            },
                            2,
                          ],
                        },
                      ],
                    },
                  },
                },
              },
              {
                $addFields: {
                  distanceInKm: {
                    $round: [{ $multiply: ['$distance', 111.32] }, 1],
                  },
                },
              },
              {
                $sort: { distanceInKm: 1 },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  _id: 1,
                  personalInfo: 1,
                  distanceInKm: 1,
                },
              },
            ],
            as: 'nearestAgents',
          },
        },
        {
          $project: {
            display: {
              trackingNumber: '$trackingNumber',
              size: '$parcelDetails.size',
              paymentType: '$payment.method',
              agentId: {
                $cond: {
                  if: { $gt: [{ $size: '$nearestAgents' }, 0] },
                  then: { $arrayElemAt: ['$nearestAgents._id', 0] },
                  else: null,
                },
              },
              agentName: {
                $cond: {
                  if: { $gt: [{ $size: '$nearestAgents' }, 0] },
                  then: {
                    $concat: [
                      {
                        $ifNull: [
                          {
                            $arrayElemAt: [
                              '$nearestAgents.personalInfo.givenName',
                              0,
                            ],
                          },
                          '',
                        ],
                      },
                      ' ',
                      {
                        $ifNull: [
                          {
                            $arrayElemAt: [
                              '$nearestAgents.personalInfo.familyName',
                              0,
                            ],
                          },
                          '',
                        ],
                      },
                    ],
                  },
                  else: null,
                },
              },
              agentInfo: {
                $cond: {
                  if: { $gt: [{ $size: '$nearestAgents' }, 0] },
                  then: { $arrayElemAt: ['$nearestAgents.personalInfo', 0] },
                  else: null,
                },
              },
              distance: {
                $cond: {
                  if: { $gt: [{ $size: '$nearestAgents' }, 0] },
                  then: { $arrayElemAt: ['$nearestAgents.distanceInKm', 0] },
                  else: 0.8,
                },
              },
              distanceUnit: 'km',
            },
          },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'All parcels retrieved successfully',
        data: {
          parcels,
        },
      });
    }
  );

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
        message: 'Parcel has been assigned successfully.',
      });
    }
  );
}
