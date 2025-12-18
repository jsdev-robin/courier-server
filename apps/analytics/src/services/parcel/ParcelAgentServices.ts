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
            status: { $ne: 'Booked' },
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
            assigned: {
              $sum: {
                $cond: [{ $eq: ['$status', ParcelStatus.ASSIGNED] }, 1, 0],
              },
            },
            pickedUp: {
              $sum: {
                $cond: [{ $eq: ['$status', ParcelStatus.PICKED_UP] }, 1, 0],
              },
            },
            inTransit: {
              $sum: {
                $cond: [{ $eq: ['$status', ParcelStatus.IN_TRANSIT] }, 1, 0],
              },
            },
            failed: {
              $sum: {
                $cond: [{ $eq: ['$status', ParcelStatus.FAILED] }, 1, 0],
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
            assigned: {
              value: '$assigned',
            },
            pickedUp: {
              value: '$pickedUp',
            },
            inTransit: {
              value: '$inTransit',
            },
            failed: {
              value: '$failed',
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
        currentEarnings: { value: 0 },
        todayCommission: { value: 0 },
        assigned: { value: 0 },
        pickedUp: { value: 0 },
        inTransit: { value: 0 },
        failed: { value: 0 },
      };

      const metrics = {
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
        data: {
          metrics,
        },
      });
    }
  );

  public findStatsMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfLastMonth = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      const stats = await Parcel.aggregate([
        {
          $match: {
            status: { $ne: 'Booked' },
            assignedAgent: new mongoose.Types.ObjectId(req.self._id),
          },
        },
        {
          $facet: {
            currentMonth: [
              {
                $match: {
                  createdAt: { $gte: startOfMonth },
                },
              },
              {
                $group: {
                  _id: null,
                  totalParcels: { $sum: 1 },
                  totalRevenue: { $sum: '$payment.amount' },
                  totalCOD: {
                    $sum: {
                      $cond: [
                        { $eq: ['$payment.method', 'COD'] },
                        '$payment.amount',
                        0,
                      ],
                    },
                  },
                  totalPrepaid: {
                    $sum: {
                      $cond: [
                        { $eq: ['$payment.method', 'Prepaid'] },
                        '$payment.amount',
                        0,
                      ],
                    },
                  },
                  deliveredParcels: {
                    $sum: {
                      $cond: [
                        { $eq: ['$status', ParcelStatus.DELIVERED] },
                        1,
                        0,
                      ],
                    },
                  },
                  deliveredRevenue: {
                    $sum: {
                      $cond: [
                        { $eq: ['$status', ParcelStatus.DELIVERED] },
                        { $ifNull: ['$payment.amount', 0] },
                        0,
                      ],
                    },
                  },
                },
              },
              {
                $project: {
                  totalParcels: { $ifNull: ['$totalParcels', 0] },
                  totalRevenue: { $ifNull: ['$totalRevenue', 0] },
                  totalCOD: { $ifNull: ['$totalCOD', 0] },
                  totalPrepaid: { $ifNull: ['$totalPrepaid', 0] },
                  deliveredParcels: { $ifNull: ['$deliveredParcels', 0] },
                  deliveredRevenue: { $ifNull: ['$deliveredRevenue', 0] },
                },
              },
            ],
            lastMonth: [
              {
                $match: {
                  createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                },
              },
              {
                $group: {
                  _id: null,
                  totalParcels: { $sum: 1 },
                  totalRevenue: { $sum: '$payment.amount' },
                  totalCOD: {
                    $sum: {
                      $cond: [
                        { $eq: ['$payment.method', 'COD'] },
                        '$payment.amount',
                        0,
                      ],
                    },
                  },
                  totalPrepaid: {
                    $sum: {
                      $cond: [
                        { $eq: ['$payment.method', 'Prepaid'] },
                        '$payment.amount',
                        0,
                      ],
                    },
                  },
                  deliveredParcels: {
                    $sum: {
                      $cond: [
                        { $eq: ['$status', ParcelStatus.DELIVERED] },
                        1,
                        0,
                      ],
                    },
                  },
                  deliveredRevenue: {
                    $sum: {
                      $cond: [
                        { $eq: ['$status', ParcelStatus.DELIVERED] },
                        { $ifNull: ['$payment.amount', 0] },
                        0,
                      ],
                    },
                  },
                },
              },
              {
                $project: {
                  totalParcels: { $ifNull: ['$totalParcels', 0] },
                  totalRevenue: { $ifNull: ['$totalRevenue', 0] },
                  totalCOD: { $ifNull: ['$totalCOD', 0] },
                  totalPrepaid: { $ifNull: ['$totalPrepaid', 0] },
                  deliveredParcels: { $ifNull: ['$deliveredParcels', 0] },
                  deliveredRevenue: { $ifNull: ['$deliveredRevenue', 0] },
                },
              },
            ],
          },
        },
        {
          $project: {
            currentMonth: { $arrayElemAt: ['$currentMonth', 0] },
            lastMonth: { $arrayElemAt: ['$lastMonth', 0] },
          },
        },
        {
          $addFields: {
            currentMonth: {
              $cond: {
                if: { $eq: ['$currentMonth', null] },
                then: {
                  totalParcels: 0,
                  totalRevenue: 0,
                  totalCOD: 0,
                  totalPrepaid: 0,
                  deliveredParcels: 0,
                  deliveredRevenue: 0,
                },
                else: '$currentMonth',
              },
            },
            lastMonth: {
              $cond: {
                if: { $eq: ['$lastMonth', null] },
                then: {
                  totalParcels: 0,
                  totalRevenue: 0,
                  totalCOD: 0,
                  totalPrepaid: 0,
                  deliveredParcels: 0,
                  deliveredRevenue: 0,
                },
                else: '$lastMonth',
              },
            },
          },
        },
        {
          $project: {
            totalParcels: '$currentMonth.totalParcels',
            totalParcelsChange: {
              $cond: {
                if: { $gt: ['$lastMonth.totalParcels', 0] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                '$currentMonth.totalParcels',
                                '$lastMonth.totalParcels',
                              ],
                            },
                            '$lastMonth.totalParcels',
                          ],
                        },
                        100,
                      ],
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
            totalRevenue: '$currentMonth.totalRevenue',
            totalRevenueChange: {
              $cond: {
                if: { $gt: ['$lastMonth.totalRevenue', 0] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                '$currentMonth.totalRevenue',
                                '$lastMonth.totalRevenue',
                              ],
                            },
                            '$lastMonth.totalRevenue',
                          ],
                        },
                        100,
                      ],
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
            codAmount: '$currentMonth.totalCOD',
            codAmountChange: {
              $cond: {
                if: { $gt: ['$lastMonth.totalCOD', 0] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                '$currentMonth.totalCOD',
                                '$lastMonth.totalCOD',
                              ],
                            },
                            '$lastMonth.totalCOD',
                          ],
                        },
                        100,
                      ],
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
            prepaidAmount: '$currentMonth.totalPrepaid',
            prepaidAmountChange: {
              $cond: {
                if: { $gt: ['$lastMonth.totalPrepaid', 0] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                '$currentMonth.totalPrepaid',
                                '$lastMonth.totalPrepaid',
                              ],
                            },
                            '$lastMonth.totalPrepaid',
                          ],
                        },
                        100,
                      ],
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
            successRate: {
              $cond: {
                if: { $gt: ['$currentMonth.totalParcels', 0] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            '$currentMonth.deliveredParcels',
                            '$currentMonth.totalParcels',
                          ],
                        },
                        100,
                      ],
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
            successRateChange: {
              $cond: {
                if: {
                  $and: [
                    { $gt: ['$currentMonth.totalParcels', 0] },
                    { $gt: ['$lastMonth.totalParcels', 0] },
                  ],
                },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $subtract: [
                            {
                              $divide: [
                                '$currentMonth.deliveredParcels',
                                '$currentMonth.totalParcels',
                              ],
                            },
                            {
                              $divide: [
                                '$lastMonth.deliveredParcels',
                                '$lastMonth.totalParcels',
                              ],
                            },
                          ],
                        },
                        100,
                      ],
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
            agentCommission: {
              value: {
                $round: [
                  { $multiply: ['$currentMonth.deliveredRevenue', 0.15] },
                  2,
                ],
              },
            },
            agentCommissionChange: {
              $cond: {
                if: { $gt: ['$lastMonth.deliveredRevenue', 0] },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                {
                                  $multiply: [
                                    '$currentMonth.deliveredRevenue',
                                    0.15,
                                  ],
                                },
                                {
                                  $multiply: [
                                    '$lastMonth.deliveredRevenue',
                                    0.15,
                                  ],
                                },
                              ],
                            },
                            {
                              $multiply: ['$lastMonth.deliveredRevenue', 0.15],
                            },
                          ],
                        },
                        100,
                      ],
                    },
                    1,
                  ],
                },
                else: 0,
              },
            },
          },
        },
      ]);

      const result = stats[0] || {
        totalParcels: 0,
        totalParcelsChange: 0,
        totalRevenue: 0,
        totalRevenueChange: 0,
        codAmount: 0,
        codAmountChange: 0,
        prepaidAmount: 0,
        prepaidAmountChange: 0,
        successRate: 0,
        successRateChange: 0,
        agentCommission: { value: 0 },
        agentCommissionChange: 0,
      };

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Agent stats retrieved successfully',
        data: {
          metrics: {
            totalParcels: {
              value: result.totalParcels,
              change: result.totalParcelsChange,
            },
            totalRevenue: {
              value: result.totalRevenue,
              change: result.totalRevenueChange,
            },
            codAmount: {
              value: result.codAmount,
              change: result.codAmountChange,
            },
            prepaidAmount: {
              value: result.prepaidAmount,
              change: result.prepaidAmountChange,
            },
            successRate: {
              value: result.successRate,
              change: result.successRateChange,
            },
            agentCommission: {
              value: result.agentCommission.value,
              change: result.agentCommissionChange,
            },
          },
        },
      });
    }
  );

  public findTodayStatusDistributionMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const chartData = await Parcel.aggregate([
        {
          $facet: {
            statusData: [
              {
                $match: {
                  createdAt: {
                    $gte: today,
                    $lt: tomorrow,
                  },
                  status: { $ne: 'Booked' },
                  assignedAgent: new mongoose.Types.ObjectId(req.self._id),
                },
              },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
        {
          $project: {
            chartData: {
              $map: {
                input: [
                  ParcelStatus.ASSIGNED,
                  ParcelStatus.PICKED_UP,
                  ParcelStatus.IN_TRANSIT,
                  ParcelStatus.DELIVERED,
                  ParcelStatus.FAILED,
                ],
                as: 'status',
                in: {
                  status: '$$status',
                  count: {
                    $let: {
                      vars: {
                        found: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$statusData',
                                as: 'item',
                                cond: { $eq: ['$$item._id', '$$status'] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: { $ifNull: ['$$found.count', 0] },
                    },
                  },
                  fill: {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: ['$$status', ParcelStatus.ASSIGNED] },
                          then: 'var(--chart-1)',
                        },
                        {
                          case: { $eq: ['$$status', ParcelStatus.PICKED_UP] },
                          then: 'var(--chart-2)',
                        },
                        {
                          case: {
                            $eq: ['$$status', ParcelStatus.IN_TRANSIT],
                          },
                          then: 'var(--chart-3)',
                        },
                        {
                          case: { $eq: ['$$status', ParcelStatus.DELIVERED] },
                          then: 'var(--chart-4)',
                        },
                        {
                          case: { $eq: ['$$status', ParcelStatus.FAILED] },
                          then: 'var(--destructive)',
                        },
                      ],
                      default: 'var(--chart-5)',
                    },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            chartData: {
              $sortArray: {
                input: '$chartData',
                sortBy: { count: -1 },
              },
            },
          },
        },
      ]);

      const metrics = chartData[0]?.chartData || [];

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Today status distribution metrics retrieved successfully',
        data: {
          metrics,
        },
      });
    }
  );

  public findMapMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const metrics = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
            status: { $ne: 'Booked' },
            assignedAgent: new mongoose.Types.ObjectId(req.self._id),
          },
        },
        {
          $project: {
            trackingNumber: 1,
            name: '$deliveryAddress.city',
            status: '$status',
            coordinates: {
              $cond: {
                if: {
                  $and: [
                    { $isArray: '$deliveryAddress.location.coordinates' },
                    {
                      $eq: [
                        { $size: '$deliveryAddress.location.coordinates' },
                        2,
                      ],
                    },
                  ],
                },
                then: '$deliveryAddress.location.coordinates',
                else: null,
              },
            },
            deliveryAddress: {
              street: '$deliveryAddress.street',
              city: '$deliveryAddress.city',
              state: '$deliveryAddress.state',
              country: '$deliveryAddress.country',
              postalCode: '$deliveryAddress.postalCode',
              contactName: '$deliveryAddress.contactName',
              contactPhone: '$deliveryAddress.contactPhone',
            },
          },
        },
        {
          $match: {
            coordinates: { $ne: null },
          },
        },
        {
          $project: {
            _id: 0,
            trackingNumber: 1,
            name: 1,
            status: 1,
            coordinates: 1,
            deliveryAddress: 1,
          },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Map distribution data retrieved successfully',
        data: {
          metrics,
        },
      });
    }
  );
}
