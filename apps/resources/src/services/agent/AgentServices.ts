import { APIFeatures } from '@server/features';
import { Agent } from '@server/models';
import { IUser } from '@server/types';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { Request, RequestHandler, Response } from 'express';

export class AgentServices {
  public find: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      console.log(req.query);

      const features = await new APIFeatures<IUser>(Agent, {
        ...req.query,
      })
        .filter()
        .paginate()
        .sort()
        .globalSearch(['personalInfo.email']);

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

  public findAvailable: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const agents = await Agent.aggregate([
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
                  createdAt: { $gte: today },
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
            todayParcels: {
              $ifNull: [{ $arrayElemAt: ['$parcelInfo.count', 0] }, 0],
            },
          },
        },
        {
          $project: {
            _id: 1,
            personalInfo: {
              familyName: 1,
              givenName: 1,
              avatar: 1,
            },
            todayParcels: 1,
          },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'All agents retrieved successfully',
        data: {
          agents: agents,
        },
      });
    }
  );
}
