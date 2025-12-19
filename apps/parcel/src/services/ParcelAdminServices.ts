import { APIFeatures } from '@server/features';
import { ApiError } from '@server/middlewares';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Model } from 'mongoose';

import { nodeClient } from '@server/cloud';
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
          select: 'personalInfo location',
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

  public findNearestToday: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const parcels = await this.model
        .aggregate([
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
        ])
        .skip(skip)
        .limit(limit);

      const total = await this.model.countDocuments({
        status: 'Booked',
        createdAt: { $gte: today, $lt: tomorrow },
      });

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'All parcels retrieved successfully',
        data: {
          limit,
          total,
          parcels,
        },
      });
    }
  );

  public findNearest: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const parcels = await this.model
        .aggregate([
          {
            $match: {
              status: 'Booked',
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
        ])
        .skip(skip)
        .limit(limit);

      const total = await this.model.countDocuments({
        status: 'Booked',
      });

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'All parcels retrieved successfully',
        data: { limit, total, parcels },
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

  public findOneAndUpdateAssignAuto: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const parcel = await this.model
        .findOne({
          $and: [{ _id: req.params.id }, { status: 'Booked' }],
        })
        .setOptions({
          writeConcern: { w: 'majority', j: true, wtimeout: 5000 },
        });

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
          longitude: parcel.deliveryAddress?.location.coordinates[0],
          latitude: parcel.deliveryAddress?.location.coordinates[1],
        },
        { radius: 100, unit: 'km' },
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
