import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { Request, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';
import { Parcel } from '../../models/parcel/ParcelModel';
import { ParcelStatus } from '../../models/parcel/schemas/trackingHistorySchema';

export class ParcelAgentServices {
  public findPerformance: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const shiftStart = new Date(today);
      shiftStart.setHours(8, 0, 0, 0);

      const shiftEnd = new Date(today);
      shiftEnd.setHours(17, 0, 0, 0);

      const performanceData = await Parcel.aggregate([
        {
          $match: {
            assignedAgent: new mongoose.Types.ObjectId(req.self._id),
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: null,
            totalAssigned: { $sum: 1 },
            completedDeliveries: {
              $sum: {
                $cond: [{ $eq: ['$status', ParcelStatus.DELIVERED] }, 1, 0],
              },
            },
            totalEarnings: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ParcelStatus.DELIVERED] },
                  { $ifNull: ['$payment.amount', 0] },
                  0,
                ],
              },
            },
            onTimeCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', ParcelStatus.DELIVERED] },
                      {
                        $lte: [
                          { $ifNull: ['$updatedAt', '$createdAt'] },
                          {
                            $add: ['$createdAt', 9 * 60 * 60 * 1000],
                          },
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $addFields: {
            todayTargetValue: {
              $cond: [
                { $eq: ['$totalAssigned', 0] },
                0,
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ['$completedDeliveries', '$totalAssigned'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
              ],
            },
            efficiencyScoreValue: {
              $cond: [
                { $eq: ['$totalAssigned', 0] },
                0,
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ['$completedDeliveries', '$totalAssigned'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
              ],
            },
            onTimeDeliveryValue: {
              $cond: [
                { $eq: ['$completedDeliveries', 0] },
                0,
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ['$onTimeCount', '$completedDeliveries'] },
                        100,
                      ],
                    },
                    1,
                  ],
                },
              ],
            },
          },
        },
        {
          $project: {
            parcelsAssigned: {
              value: '$totalAssigned',
            },
            completed: {
              value: '$completedDeliveries',
            },
            todayTarget: {
              value: '$todayTargetValue',
            },
            efficiencyScore: {
              value: '$efficiencyScoreValue',
            },
            onTimeDelivery: {
              value: '$onTimeDeliveryValue',
            },
            currentEarnings: {
              value: { $round: ['$totalEarnings', 2] },
            },
            todayCommission: {
              value: {
                $round: [{ $multiply: ['$totalEarnings', 0.15] }, 2],
              },
            },
          },
        },
      ]);

      const currentTime = new Date();
      const isShiftActive =
        currentTime >= shiftStart && currentTime <= shiftEnd;

      const result = performanceData[0] || {
        parcelsAssigned: { value: 0 },
        completed: { value: 0 },
        todayTarget: { value: 0 },
        efficiencyScore: { value: 0 },
        onTimeDelivery: { value: 0 },
        currentEarnings: { value: 0, formatted: '$0.00' },
        todayCommission: { value: 0, formatted: '+$0.00' },
      };

      const responseData = {
        shift: {
          start: shiftStart.toISOString(),
          end: shiftEnd.toISOString(),
          isActive: isShiftActive,
          display: '8:00 AM - 5:00 PM',
        },
        pauseDeliveryRun: !isShiftActive,
        ...result,
      };

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Agent performance metrics retrieved successfully',
        data: responseData,
      });
    }
  );
}
