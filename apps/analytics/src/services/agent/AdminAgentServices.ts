import { Agent } from '@server/models';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { Request, RequestHandler, Response } from 'express';
import { ParcelStatus } from '../../models/parcel/schemas/trackingHistorySchema';

export class AdminAgentServices {
  static findMapMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const metrics = await Agent.aggregate([
        {
          $match: {
            'location.coordinates': { $exists: true, $ne: null },
            $expr: {
              $and: [
                { $isArray: '$location.coordinates' },
                { $eq: [{ $size: '$location.coordinates' }, 2] },
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'parcels',
            let: { agentId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$assignedAgent', '$$agentId'],
                  },
                  status: { $ne: ParcelStatus.DELIVERED },
                },
              },
              {
                $count: 'count',
              },
            ],
            as: 'parcelInfo',
          },
        },
        {
          $addFields: {
            activeParcels: {
              $ifNull: [{ $arrayElemAt: ['$parcelInfo.count', 0] }, 0],
            },
          },
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
            coordinates: '$location.coordinates',
            activeParcels: 1,
            email: '$personalInfo.email',
            phone: '$personalInfo.phone',
            _id: 1,
          },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Agent map metrics retrieved successfully',
        data: {
          metrics,
        },
      });
    }
  );
}
