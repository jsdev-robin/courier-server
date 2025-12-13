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

  // public findGeoNear: RequestHandler = catchAsync(
  //   async (req: Request, res: Response): Promise<void> => {
  //     const parcels = await this.model.aggregate([
  //       {
  //         $match: {
  //           status: 'Booked',
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'agents',
  //           let: {
  //             parcelLat: '$pickupAddress.coordinates.lat',
  //             parcelLng: '$pickupAddress.coordinates.lng',
  //           },
  //           pipeline: [
  //             {
  //               $match: {
  //                 'location.lat': { $exists: true, $ne: null },
  //                 'location.lng': { $exists: true, $ne: null },
  //               },
  //             },
  //             {
  //               $addFields: {
  //                 distance: {
  //                   $sqrt: {
  //                     $add: [
  //                       {
  //                         $pow: [
  //                           {
  //                             $subtract: ['$$parcelLat', '$location.lat'],
  //                           },
  //                           2,
  //                         ],
  //                       },
  //                       {
  //                         $pow: [
  //                           {
  //                             $subtract: ['$$parcelLng', '$location.lng'],
  //                           },
  //                           2,
  //                         ],
  //                       },
  //                     ],
  //                   },
  //                 },
  //               },
  //             },
  //             {
  //               $addFields: {
  //                 distanceInMiles: {
  //                   $round: [{ $multiply: ['$distance', 69] }, 1],
  //                 },
  //               },
  //             },
  //             {
  //               $sort: { distanceInMiles: 1 },
  //             },
  //             {
  //               $limit: 1,
  //             },
  //             {
  //               $project: {
  //                 name: {
  //                   $concat: [
  //                     { $ifNull: ['$personalInfo.givenName', ''] },
  //                     ' ',
  //                     { $ifNull: ['$personalInfo.familyName', ''] },
  //                   ],
  //                 },
  //                 distanceInMiles: 1,
  //               },
  //             },
  //           ],
  //           as: 'nearestAgents',
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'customer',
  //           foreignField: '_id',
  //           as: 'customerInfo',
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: '$customerInfo',
  //           preserveNullAndEmptyArrays: true,
  //         },
  //       },
  //       {
  //         $project: {
  //           display: {
  //             trackingNumber: '$trackingNumber',
  //             size: '$parcelDetails.size',
  //             paymentType: '$payment.type',
  //             customerName: { $ifNull: ['$customerInfo.name', 'Customer'] },
  //             distance: {
  //               $cond: {
  //                 if: {
  //                   $and: [
  //                     { $gt: [{ $size: '$nearestAgents' }, 0] },
  //                     {
  //                       $ne: [
  //                         {
  //                           $arrayElemAt: ['$nearestAgents.distanceInMiles', 0],
  //                         },
  //                         null,
  //                       ],
  //                     },
  //                   ],
  //                 },
  //                 then: { $arrayElemAt: ['$nearestAgents.distanceInMiles', 0] },
  //                 else: 0.8,
  //               },
  //             },
  //             distanceUnit: 'miles',
  //             nearestAgent: {
  //               $cond: {
  //                 if: { $gt: [{ $size: '$nearestAgents' }, 0] },
  //                 then: { $arrayElemAt: ['$nearestAgents', 0] },
  //                 else: null,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     ]);

  //     res.status(HttpStatusCode.OK).json({
  //       status: Status.SUCCESS,
  //       message: 'All parcels retrieved successfully',
  //       data: {
  //         parcels,
  //       },
  //     });
  //   }
  // );

  public findGeoNear: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const parcels = await this.model.aggregate([
        {
          $match: {
            status: 'Booked',
          },
        },
        {
          $lookup: {
            from: 'agents',
            let: {
              parcelLat: '$pickupAddress.coordinates.lat',
              parcelLng: '$pickupAddress.coordinates.lng',
            },
            pipeline: [
              {
                $match: {
                  'location.lat': { $exists: true, $ne: null },
                  'location.lng': { $exists: true, $ne: null },
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
                              $subtract: ['$$parcelLat', '$location.lat'],
                            },
                            2,
                          ],
                        },
                        {
                          $pow: [
                            {
                              $subtract: ['$$parcelLng', '$location.lng'],
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
                  distanceInMiles: {
                    $round: [{ $multiply: ['$distance', 69] }, 1],
                  },
                },
              },
              {
                $sort: { distanceInMiles: 1 },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  name: {
                    $concat: [
                      { $ifNull: ['$personalInfo.givenName', ''] },
                      ' ',
                      { $ifNull: ['$personalInfo.familyName', ''] },
                    ],
                  },
                  distanceInMiles: 1,
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
              paymentType: '$payment.type',
              agentName: {
                $cond: {
                  if: { $gt: [{ $size: '$nearestAgents' }, 0] },
                  then: { $arrayElemAt: ['$nearestAgents.name', 0] },
                  else: null,
                },
              },
              distance: {
                $cond: {
                  if: { $gt: [{ $size: '$nearestAgents' }, 0] },
                  then: { $arrayElemAt: ['$nearestAgents.distanceInMiles', 0] },
                  else: 0.8,
                },
              },
              distanceUnit: 'miles',
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
