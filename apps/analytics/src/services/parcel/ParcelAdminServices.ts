import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { Request, RequestHandler, Response } from 'express';
import { Parcel } from '../../models/parcel/ParcelModel';
import { ParcelStatus } from '../../models/parcel/schemas/trackingHistorySchema';

export class ParcelAdminServices {
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
                },
              },
              {
                $project: {
                  totalParcels: { $ifNull: ['$totalParcels', 0] },
                  totalRevenue: { $ifNull: ['$totalRevenue', 0] },
                  totalCOD: { $ifNull: ['$totalCOD', 0] },
                  totalPrepaid: { $ifNull: ['$totalPrepaid', 0] },
                  deliveredParcels: { $ifNull: ['$deliveredParcels', 0] },
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
                },
              },
              {
                $project: {
                  totalParcels: { $ifNull: ['$totalParcels', 0] },
                  totalRevenue: { $ifNull: ['$totalRevenue', 0] },
                  totalCOD: { $ifNull: ['$totalCOD', 0] },
                  totalPrepaid: { $ifNull: ['$totalPrepaid', 0] },
                  deliveredParcels: { $ifNull: ['$deliveredParcels', 0] },
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
          $project: {
            currentMonth: {
              $cond: {
                if: { $eq: ['$currentMonth', null] },
                then: {
                  totalParcels: 0,
                  totalRevenue: 0,
                  totalCOD: 0,
                  totalPrepaid: 0,
                  deliveredParcels: 0,
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
                else: 0,
              },
            },
            totalRevenue: '$currentMonth.totalRevenue',
            totalRevenueChange: {
              $cond: {
                if: { $gt: ['$lastMonth.totalRevenue', 0] },
                then: {
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
                else: 0,
              },
            },
            codAmount: '$currentMonth.totalCOD',
            codAmountChange: {
              $cond: {
                if: { $gt: ['$lastMonth.totalCOD', 0] },
                then: {
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
                else: 0,
              },
            },
            prepaidAmount: '$currentMonth.totalPrepaid',
            prepaidAmountChange: {
              $cond: {
                if: { $gt: ['$lastMonth.totalPrepaid', 0] },
                then: {
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
                else: 0,
              },
            },
            successRate: {
              $cond: {
                if: { $gt: ['$currentMonth.totalParcels', 0] },
                then: {
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
                else: 0,
              },
            },
          },
        },
        {
          $project: {
            totalParcels: 1,
            totalParcelsChange: {
              $round: ['$totalParcelsChange', 1],
            },
            totalRevenue: 1,
            totalRevenueChange: {
              $round: ['$totalRevenueChange', 1],
            },
            codAmount: 1,
            codAmountChange: {
              $round: ['$codAmountChange', 1],
            },
            prepaidAmount: 1,
            prepaidAmountChange: {
              $round: ['$prepaidAmountChange', 1],
            },
            successRate: {
              $round: ['$successRate', 1],
            },
            successRateChange: {
              $round: ['$successRateChange', 1],
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
      };

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Parcel stats retrieved successfully',
        data: {
          metrics: {
            totalParcels: result.totalParcels,
            totalParcelsChange: result.totalParcelsChange,
            totalRevenue: result.totalRevenue,
            totalRevenueChange: result.totalRevenueChange,
            codAmount: result.codAmount,
            codAmountChange: result.codAmountChange,
            prepaidAmount: result.prepaidAmount,
            prepaidAmountChange: result.prepaidAmountChange,
            successRate: result.successRate,
            successRateChange: result.successRateChange,
          },
        },
      });
    }
  );

  public findStatusDistributionMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const statusDistribution = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        {
          $facet: {
            stats: [
              {
                $group: {
                  _id: null,
                  total: { $sum: '$count' },
                },
              },
            ],
            statuses: [
              {
                $project: {
                  status: '$_id',
                  count: 1,
                  _id: 0,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: '$stats',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            total: { $ifNull: ['$stats.total', 0] },
            statuses: 1,
          },
        },
        {
          $project: {
            total: 1,
            statuses: {
              $map: {
                input: '$statuses',
                as: 'statusItem',
                in: {
                  status: '$$statusItem.status',
                  count: '$$statusItem.count',
                  percentage: {
                    $cond: {
                      if: { $gt: ['$total', 0] },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: ['$$statusItem.count', '$total'],
                              },
                              100,
                            ],
                          },
                          0,
                        ],
                      },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            total: 1,
            distribution: {
              $concatArrays: [
                '$statuses',
                {
                  $filter: {
                    input: [
                      {
                        status: ParcelStatus.BOOKED,
                        count: 0,
                        percentage: 0,
                      },
                      {
                        status: ParcelStatus.ASSIGNED,
                        count: 0,
                        percentage: 0,
                      },
                      {
                        status: ParcelStatus.PICKED_UP,
                        count: 0,
                        percentage: 0,
                      },
                      {
                        status: ParcelStatus.IN_TRANSIT,
                        count: 0,
                        percentage: 0,
                      },
                      {
                        status: ParcelStatus.DELIVERED,
                        count: 0,
                        percentage: 0,
                      },
                      {
                        status: ParcelStatus.FAILED,
                        count: 0,
                        percentage: 0,
                      },
                    ],
                    as: 'defaultStatus',
                    cond: {
                      $not: {
                        $in: ['$$defaultStatus.status', '$statuses.status'],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $project: {
            total: 1,
            distribution: {
              $sortArray: {
                input: '$distribution',
                sortBy: { count: -1 },
              },
            },
          },
        },
      ]);

      const result = statusDistribution[0] || {
        total: 0,
        distribution: [
          { status: ParcelStatus.BOOKED, count: 0, percentage: 0 },
          { status: ParcelStatus.ASSIGNED, count: 0, percentage: 0 },
          { status: ParcelStatus.PICKED_UP, count: 0, percentage: 0 },
          { status: ParcelStatus.IN_TRANSIT, count: 0, percentage: 0 },
          { status: ParcelStatus.DELIVERED, count: 0, percentage: 0 },
          { status: ParcelStatus.FAILED, count: 0, percentage: 0 },
        ],
      };

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Parcel status distribution for today retrieved successfully',
        data: result,
      });
    }
  );

  public findSizeDistributionMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sizeDistribution = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: '$parcelDetails.size',
            count: { $sum: 1 },
          },
        },
        {
          $facet: {
            stats: [
              {
                $group: {
                  _id: null,
                  total: { $sum: '$count' },
                },
              },
            ],
            sizes: [
              {
                $project: {
                  size: '$_id',
                  count: 1,
                  _id: 0,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: '$stats',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            total: { $ifNull: ['$stats.total', 0] },
            sizes: 1,
          },
        },
        {
          $project: {
            total: 1,
            sizes: {
              $map: {
                input: '$sizes',
                as: 'sizeItem',
                in: {
                  size: '$$sizeItem.size',
                  count: '$$sizeItem.count',
                  percentage: {
                    $cond: {
                      if: { $gt: ['$total', 0] },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: ['$$sizeItem.count', '$total'],
                              },
                              100,
                            ],
                          },
                          0,
                        ],
                      },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            total: 1,
            distribution: {
              $concatArrays: [
                '$sizes',
                {
                  $filter: {
                    input: [
                      {
                        size: 'Small',
                        count: 0,
                        percentage: 0,
                      },
                      {
                        size: 'Medium',
                        count: 0,
                        percentage: 0,
                      },
                      {
                        size: 'Large',
                        count: 0,
                        percentage: 0,
                      },
                    ],
                    as: 'defaultSize',
                    cond: {
                      $not: {
                        $in: ['$$defaultSize.size', '$sizes.size'],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $project: {
            total: 1,
            distribution: {
              $sortArray: {
                input: '$distribution',
                sortBy: { count: -1 },
              },
            },
          },
        },
      ]);

      const result = sizeDistribution[0] || {
        total: 0,
        distribution: [
          { size: 'Small', count: 0, percentage: 0 },
          { size: 'Medium', count: 0, percentage: 0 },
          { size: 'Large', count: 0, percentage: 0 },
        ],
      };

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Parcel size distribution for today retrieved successfully',
        data: result,
      });
    }
  );

  public findTopPerformingAgentsMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const performingAgents = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
            assignedAgent: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$assignedAgent',
            totalDeliveries: { $sum: 1 },
            successfulDeliveries: {
              $sum: {
                $cond: [{ $eq: ['$status', ParcelStatus.DELIVERED] }, 1, 0],
              },
            },
          },
        },
        {
          $match: {
            totalDeliveries: { $gt: 0 },
          },
        },
        {
          $lookup: {
            from: 'agents',
            localField: '_id',
            foreignField: '_id',
            as: 'agentInfo',
          },
        },
        {
          $unwind: {
            path: '$agentInfo',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            agentId: '$_id',
            name: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$agentInfo.personalInfo.givenName', null] },
                    { $ne: ['$agentInfo.personalInfo.familyName', null] },
                  ],
                },
                then: {
                  $concat: [
                    { $ifNull: ['$agentInfo.personalInfo.givenName', ''] },
                    ' ',
                    { $ifNull: ['$agentInfo.personalInfo.familyName', ''] },
                  ],
                },
                else: 'Unknown Agent',
              },
            },
            totalDeliveries: 1,
            successfulDeliveries: 1,
            successRate: {
              $cond: {
                if: { $gt: ['$totalDeliveries', 0] },
                then: {
                  $multiply: [
                    {
                      $divide: ['$successfulDeliveries', '$totalDeliveries'],
                    },
                    100,
                  ],
                },
                else: 0,
              },
            },
          },
        },
        {
          $facet: {
            agents: [
              {
                $sort: {
                  successRate: -1,
                  totalDeliveries: -1,
                },
              },
              {
                $limit: 10,
              },
              {
                $project: {
                  _id: 0,
                  agentId: 1,
                  name: 1,
                  deliveries: '$totalDeliveries',
                  successRate: {
                    $round: ['$successRate', 0],
                  },
                },
              },
            ],
            totalCount: [
              {
                $count: 'total',
              },
            ],
          },
        },
        {
          $project: {
            agents: 1,
            total: {
              $cond: {
                if: { $gt: [{ $size: '$totalCount' }, 0] },
                then: { $arrayElemAt: ['$totalCount.total', 0] },
                else: 0,
              },
            },
          },
        },
      ]);

      const result = performingAgents[0] || {
        agents: [],
        total: 0,
      };

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Top performing agents retrieved successfully',
        data: result,
      });
    }
  );

  public findMapMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mapDistribution = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $project: {
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
            name: 1,
            status: 1,
            coordinates: 1,
          },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Map distribution data retrieved successfully',
        data: mapDistribution,
      });
    }
  );

  public findRevenueMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      const startOfMonth = new Date(currentYear, currentMonth, 1);

      const revenueData = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: { $sum: '$payment.amount' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            data: {
              $push: {
                date: '$_id',
                revenue: '$revenue',
                count: '$count',
              },
            },
          },
        },
        {
          $project: {
            revenueData: {
              $map: {
                input: '$data',
                as: 'item',
                in: {
                  revenue: '$$item.revenue',
                  growth: {
                    $multiply: [
                      {
                        $divide: [
                          { $subtract: ['$$item.revenue', 10000] },
                          10000,
                        ],
                      },
                      100,
                    ],
                  },
                },
              },
            },
          },
        },
      ]);

      const result = revenueData[0]?.revenueData || [];

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Revenue metrics retrieved successfully',
        data: result,
      });
    }
  );

  public findStatusMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfLastMonth = new Date(currentYear, currentMonth, 0);

      const statusData = await Parcel.aggregate([
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
                  _id: '$status',
                  count: { $sum: 1 },
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
                  _id: '$status',
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
        {
          $project: {
            allStatuses: {
              $map: {
                input: {
                  $filter: {
                    input: [
                      ParcelStatus.BOOKED,
                      ParcelStatus.ASSIGNED,
                      ParcelStatus.PICKED_UP,
                      ParcelStatus.IN_TRANSIT,
                      ParcelStatus.DELIVERED,
                      ParcelStatus.FAILED,
                    ],
                    as: 'status',
                    cond: { $ne: ['$$status', null] },
                  },
                },
                as: 'status',
                in: {
                  status: '$$status',
                  currentCount: {
                    $let: {
                      vars: {
                        found: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$currentMonth',
                                as: 'cm',
                                cond: { $eq: ['$$cm._id', '$$status'] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: { $ifNull: ['$$found.count', 0] },
                    },
                  },
                  lastCount: {
                    $let: {
                      vars: {
                        found: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$lastMonth',
                                as: 'lm',
                                cond: { $eq: ['$$lm._id', '$$status'] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: { $ifNull: ['$$found.count', 0] },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            statusData: {
              $map: {
                input: '$allStatuses',
                as: 'statusItem',
                in: {
                  status: '$$statusItem.status',
                  count: '$$statusItem.currentCount',
                  growth: {
                    $cond: {
                      if: { $gt: ['$$statusItem.lastCount', 0] },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  {
                                    $subtract: [
                                      '$$statusItem.currentCount',
                                      '$$statusItem.lastCount',
                                    ],
                                  },
                                  '$$statusItem.lastCount',
                                ],
                              },
                              100,
                            ],
                          },
                          0,
                        ],
                      },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            statusData: {
              $sortArray: {
                input: '$statusData',
                sortBy: { count: -1 },
              },
            },
          },
        },
      ]);

      const result = statusData[0]?.statusData || [];

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Status metrics retrieved successfully',
        data: result,
      });
    }
  );

  public findSuccessRateMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfLastMonth = new Date(currentYear, currentMonth, 0);

      const successRateData = await Parcel.aggregate([
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
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  delivered: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0],
                    },
                  },
                  total: { $sum: 1 },
                },
              },
              {
                $project: {
                  date: {
                    $dateFromString: {
                      dateString: '$_id',
                      format: '%Y-%m-%d',
                    },
                  },
                  successRate: {
                    $cond: {
                      if: { $gt: ['$total', 0] },
                      then: {
                        $multiply: [
                          {
                            $divide: ['$delivered', '$total'],
                          },
                          100,
                        ],
                      },
                      else: 0,
                    },
                  },
                },
              },
              {
                $densify: {
                  field: 'date',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [startOfMonth, currentDate],
                  },
                },
              },
              {
                $project: {
                  date: {
                    $dateToString: { format: '%Y-%m-%d', date: '$date' },
                  },
                  successRate: {
                    $ifNull: ['$successRate', 0],
                  },
                },
              },
              {
                $sort: { date: 1 },
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
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  delivered: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0],
                    },
                  },
                  total: { $sum: 1 },
                },
              },
              {
                $project: {
                  date: {
                    $dateFromString: {
                      dateString: '$_id',
                      format: '%Y-%m-%d',
                    },
                  },
                  successRate: {
                    $cond: {
                      if: { $gt: ['$total', 0] },
                      then: {
                        $multiply: [
                          {
                            $divide: ['$delivered', '$total'],
                          },
                          100,
                        ],
                      },
                      else: 0,
                    },
                  },
                },
              },
              {
                $densify: {
                  field: 'date',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [startOfLastMonth, endOfLastMonth],
                  },
                },
              },
              {
                $project: {
                  date: {
                    $dateToString: { format: '%Y-%m-%d', date: '$date' },
                  },
                  successRate: {
                    $ifNull: ['$successRate', 0],
                  },
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
          },
        },
        {
          $project: {
            successRateData: {
              $map: {
                input: { $range: [0, { $size: '$currentMonth' }] },
                as: 'index',
                in: {
                  successRate: {
                    $round: [
                      {
                        $arrayElemAt: ['$currentMonth.successRate', '$$index'],
                      },
                      1,
                    ],
                  },
                  growth: {
                    $cond: {
                      if: {
                        $and: [
                          {
                            $gt: [
                              {
                                $arrayElemAt: [
                                  '$currentMonth.successRate',
                                  '$$index',
                                ],
                              },
                              0,
                            ],
                          },
                          {
                            $gt: [
                              {
                                $arrayElemAt: [
                                  '$lastMonth.successRate',
                                  '$$index',
                                ],
                              },
                              0,
                            ],
                          },
                        ],
                      },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  {
                                    $subtract: [
                                      {
                                        $arrayElemAt: [
                                          '$currentMonth.successRate',
                                          '$$index',
                                        ],
                                      },
                                      {
                                        $arrayElemAt: [
                                          '$lastMonth.successRate',
                                          '$$index',
                                        ],
                                      },
                                    ],
                                  },
                                  {
                                    $arrayElemAt: [
                                      '$lastMonth.successRate',
                                      '$$index',
                                    ],
                                  },
                                ],
                              },
                              100,
                            ],
                          },
                          0,
                        ],
                      },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      const result = successRateData[0]?.successRateData || [];

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Success rate metrics retrieved successfully',
        data: result,
      });
    }
  );

  public findCODMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfLastMonth = new Date(currentYear, currentMonth, 0);

      const codData = await Parcel.aggregate([
        {
          $facet: {
            currentMonth: [
              {
                $match: {
                  createdAt: { $gte: startOfMonth },
                  'payment.method': 'COD',
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  codAmount: { $sum: '$payment.amount' },
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  date: {
                    $dateFromString: {
                      dateString: '$_id',
                      format: '%Y-%m-%d',
                    },
                  },
                  codAmount: { $ifNull: ['$codAmount', 0] },
                  count: { $ifNull: ['$count', 0] },
                },
              },
              {
                $densify: {
                  field: 'date',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [startOfMonth, currentDate],
                  },
                },
              },
              {
                $project: {
                  date: {
                    $dateToString: { format: '%Y-%m-%d', date: '$date' },
                  },
                  codAmount: 1,
                  count: 1,
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
            lastMonth: [
              {
                $match: {
                  createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                  'payment.method': 'COD',
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  codAmount: { $sum: '$payment.amount' },
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  date: {
                    $dateFromString: {
                      dateString: '$_id',
                      format: '%Y-%m-%d',
                    },
                  },
                  codAmount: { $ifNull: ['$codAmount', 0] },
                  count: { $ifNull: ['$count', 0] },
                },
              },
              {
                $densify: {
                  field: 'date',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [startOfLastMonth, endOfLastMonth],
                  },
                },
              },
              {
                $project: {
                  date: {
                    $dateToString: { format: '%Y-%m-%d', date: '$date' },
                  },
                  codAmount: 1,
                  count: 1,
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
          },
        },
        {
          $project: {
            codData: {
              $map: {
                input: { $range: [0, { $size: '$currentMonth' }] },
                as: 'index',
                in: {
                  codAmount: {
                    $arrayElemAt: ['$currentMonth.codAmount', '$$index'],
                  },
                  count: {
                    $arrayElemAt: ['$currentMonth.count', '$$index'],
                  },
                  growth: {
                    $cond: {
                      if: {
                        $and: [
                          {
                            $gt: [
                              {
                                $arrayElemAt: [
                                  '$currentMonth.codAmount',
                                  '$$index',
                                ],
                              },
                              0,
                            ],
                          },
                          {
                            $gt: [
                              {
                                $arrayElemAt: [
                                  '$lastMonth.codAmount',
                                  '$$index',
                                ],
                              },
                              0,
                            ],
                          },
                        ],
                      },
                      then: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  {
                                    $subtract: [
                                      {
                                        $arrayElemAt: [
                                          '$currentMonth.codAmount',
                                          '$$index',
                                        ],
                                      },
                                      {
                                        $arrayElemAt: [
                                          '$lastMonth.codAmount',
                                          '$$index',
                                        ],
                                      },
                                    ],
                                  },
                                  {
                                    $arrayElemAt: [
                                      '$lastMonth.codAmount',
                                      '$$index',
                                    ],
                                  },
                                ],
                              },
                              100,
                            ],
                          },
                          0,
                        ],
                      },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      const result = codData[0]?.codData || [];

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'COD metrics retrieved successfully',
        data: result,
      });
    }
  );

  // Last 7 days
  public findParcelLast7Days: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      currentDate.setHours(23, 59, 59, 999);

      const parcelData = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: currentDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            parcels: { $sum: 1 },
          },
        },
        {
          $project: {
            date: {
              $dateFromString: {
                dateString: '$_id',
                format: '%Y-%m-%d',
              },
            },
            parcels: { $ifNull: ['$parcels', 0] },
          },
        },
        {
          $densify: {
            field: 'date',
            range: {
              step: 1,
              unit: 'day',
              bounds: [startDate, currentDate],
            },
          },
        },
        {
          $setWindowFields: {
            sortBy: { date: 1 },
            output: {
              parcels: {
                $max: '$parcels',
                window: {
                  documents: ['unbounded', 'current'],
                },
              },
            },
          },
        },
        {
          $project: {
            parcels: {
              $ifNull: ['$parcels', 0],
            },
            _id: 0,
          },
        },
        {
          $sort: { date: 1 },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Last 7 days parcel data retrieved successfully',
        data: parcelData,
      });
    }
  );

  public findPrepaidLast7Days: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      currentDate.setHours(23, 59, 59, 999);

      const prepaidData = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: currentDate },
            'payment.method': 'Prepaid',
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            amount: { $sum: '$payment.amount' },
            parcels: { $sum: 1 },
          },
        },
        {
          $project: {
            date: {
              $dateFromString: {
                dateString: '$_id',
                format: '%Y-%m-%d',
              },
            },
            amount: { $ifNull: ['$amount', 0] },
            parcels: { $ifNull: ['$parcels', 0] },
          },
        },
        {
          $densify: {
            field: 'date',
            range: {
              step: 1,
              unit: 'day',
              bounds: [startDate, currentDate],
            },
          },
        },
        {
          $setWindowFields: {
            sortBy: { date: 1 },
            output: {
              amount: {
                $max: '$amount',
                window: {
                  documents: ['unbounded', 'current'],
                },
              },
              parcels: {
                $max: '$parcels',
                window: {
                  documents: ['unbounded', 'current'],
                },
              },
            },
          },
        },
        {
          $project: {
            amount: {
              $ifNull: ['$amount', 0],
            },
            parcels: {
              $ifNull: ['$parcels', 0],
            },
            _id: 0,
          },
        },
        {
          $sort: { date: 1 },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Last 7 days prepaid data retrieved successfully',
        data: prepaidData,
      });
    }
  );

  public findCodLast7Days: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      currentDate.setHours(23, 59, 59, 999);

      const codData = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: currentDate },
            'payment.method': 'COD',
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            amount: { $sum: '$payment.amount' },
            parcels: { $sum: 1 },
          },
        },
        {
          $project: {
            date: {
              $dateFromString: {
                dateString: '$_id',
                format: '%Y-%m-%d',
              },
            },
            amount: { $ifNull: ['$amount', 0] },
            parcels: { $ifNull: ['$parcels', 0] },
          },
        },
        {
          $densify: {
            field: 'date',
            range: {
              step: 1,
              unit: 'day',
              bounds: [startDate, currentDate],
            },
          },
        },
        {
          $setWindowFields: {
            sortBy: { date: 1 },
            output: {
              amount: {
                $max: '$amount',
                window: {
                  documents: ['unbounded', 'current'],
                },
              },
              parcels: {
                $max: '$parcels',
                window: {
                  documents: ['unbounded', 'current'],
                },
              },
            },
          },
        },
        {
          $project: {
            amount: {
              $ifNull: ['$amount', 0],
            },
            parcels: {
              $ifNull: ['$parcels', 0],
            },
            _id: 0,
          },
        },
        {
          $sort: { date: 1 },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Last 7 days COD data retrieved successfully',
        data: codData,
      });
    }
  );

  public findSuccessRateLast7Days: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      currentDate.setHours(23, 59, 59, 999);

      const successRateData = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: currentDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            totalParcels: { $sum: 1 },
            deliveredParcels: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            date: {
              $dateFromString: {
                dateString: '$_id',
                format: '%Y-%m-%d',
              },
            },
            totalParcels: { $ifNull: ['$totalParcels', 0] },
            deliveredParcels: { $ifNull: ['$deliveredParcels', 0] },
            successRate: {
              $cond: {
                if: { $gt: ['$totalParcels', 0] },
                then: {
                  $multiply: [
                    {
                      $divide: ['$deliveredParcels', '$totalParcels'],
                    },
                    100,
                  ],
                },
                else: 0,
              },
            },
          },
        },
        {
          $densify: {
            field: 'date',
            range: {
              step: 1,
              unit: 'day',
              bounds: [startDate, currentDate],
            },
          },
        },
        {
          $setWindowFields: {
            sortBy: { date: 1 },
            output: {
              successRate: {
                $max: '$successRate',
                window: {
                  documents: ['unbounded', 'current'],
                },
              },
            },
          },
        },
        {
          $project: {
            successRate: {
              $round: [{ $ifNull: ['$successRate', 0] }, 1],
            },
            _id: 0,
          },
        },
        {
          $sort: { date: 1 },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Last 7 days success rate data retrieved successfully',
        data: successRateData,
      });
    }
  );

  public findLast7DaysMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const currentDate = new Date();
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      currentDate.setHours(23, 59, 59, 999);

      const allData = await Parcel.aggregate([
        {
          $facet: {
            parcels: [
              {
                $match: {
                  createdAt: { $gte: startDate, $lte: currentDate },
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  parcels: { $sum: 1 },
                },
              },
              {
                $project: {
                  date: {
                    $dateFromString: {
                      dateString: '$_id',
                      format: '%Y-%m-%d',
                    },
                  },
                  parcels: { $ifNull: ['$parcels', 0] },
                },
              },
              {
                $densify: {
                  field: 'date',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [startDate, currentDate],
                  },
                },
              },
              {
                $setWindowFields: {
                  sortBy: { date: 1 },
                  output: {
                    parcels: {
                      $max: '$parcels',
                      window: {
                        documents: ['unbounded', 'current'],
                      },
                    },
                  },
                },
              },
              {
                $project: {
                  parcels: { $ifNull: ['$parcels', 0] },
                  _id: 0,
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
            prepaid: [
              {
                $match: {
                  createdAt: { $gte: startDate, $lte: currentDate },
                  'payment.method': 'Prepaid',
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  amount: { $sum: '$payment.amount' },
                  parcels: { $sum: 1 },
                },
              },
              {
                $project: {
                  date: {
                    $dateFromString: {
                      dateString: '$_id',
                      format: '%Y-%m-%d',
                    },
                  },
                  amount: { $ifNull: ['$amount', 0] },
                  parcels: { $ifNull: ['$parcels', 0] },
                },
              },
              {
                $densify: {
                  field: 'date',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [startDate, currentDate],
                  },
                },
              },
              {
                $setWindowFields: {
                  sortBy: { date: 1 },
                  output: {
                    amount: {
                      $max: '$amount',
                      window: {
                        documents: ['unbounded', 'current'],
                      },
                    },
                    parcels: {
                      $max: '$parcels',
                      window: {
                        documents: ['unbounded', 'current'],
                      },
                    },
                  },
                },
              },
              {
                $project: {
                  amount: { $ifNull: ['$amount', 0] },
                  parcels: { $ifNull: ['$parcels', 0] },
                  _id: 0,
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
            cod: [
              {
                $match: {
                  createdAt: { $gte: startDate, $lte: currentDate },
                  'payment.method': 'COD',
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  amount: { $sum: '$payment.amount' },
                  parcels: { $sum: 1 },
                },
              },
              {
                $project: {
                  date: {
                    $dateFromString: {
                      dateString: '$_id',
                      format: '%Y-%m-%d',
                    },
                  },
                  amount: { $ifNull: ['$amount', 0] },
                  parcels: { $ifNull: ['$parcels', 0] },
                },
              },
              {
                $densify: {
                  field: 'date',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [startDate, currentDate],
                  },
                },
              },
              {
                $setWindowFields: {
                  sortBy: { date: 1 },
                  output: {
                    amount: {
                      $max: '$amount',
                      window: {
                        documents: ['unbounded', 'current'],
                      },
                    },
                    parcels: {
                      $max: '$parcels',
                      window: {
                        documents: ['unbounded', 'current'],
                      },
                    },
                  },
                },
              },
              {
                $project: {
                  amount: { $ifNull: ['$amount', 0] },
                  parcels: { $ifNull: ['$parcels', 0] },
                  _id: 0,
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
            successRate: [
              {
                $match: {
                  createdAt: { $gte: startDate, $lte: currentDate },
                },
              },
              {
                $group: {
                  _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                  },
                  totalParcels: { $sum: 1 },
                  deliveredParcels: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0],
                    },
                  },
                },
              },
              {
                $project: {
                  date: {
                    $dateFromString: {
                      dateString: '$_id',
                      format: '%Y-%m-%d',
                    },
                  },
                  totalParcels: { $ifNull: ['$totalParcels', 0] },
                  deliveredParcels: { $ifNull: ['$deliveredParcels', 0] },
                  successRate: {
                    $cond: {
                      if: { $gt: ['$totalParcels', 0] },
                      then: {
                        $multiply: [
                          {
                            $divide: ['$deliveredParcels', '$totalParcels'],
                          },
                          100,
                        ],
                      },
                      else: 0,
                    },
                  },
                },
              },
              {
                $densify: {
                  field: 'date',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [startDate, currentDate],
                  },
                },
              },
              {
                $setWindowFields: {
                  sortBy: { date: 1 },
                  output: {
                    successRate: {
                      $max: '$successRate',
                      window: {
                        documents: ['unbounded', 'current'],
                      },
                    },
                  },
                },
              },
              {
                $project: {
                  successRate: {
                    $round: [{ $ifNull: ['$successRate', 0] }, 1],
                  },
                  _id: 0,
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
          },
        },
        {
          $project: {
            parcels: '$parcels',
            prepaid: '$prepaid',
            cod: '$cod',
            successRate: '$successRate',
          },
        },
      ]);

      const metrics = allData[0] || {
        parcels: [],
        prepaid: [],
        cod: [],
        successRate: [],
      };

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Last 7 days metrics retrieved successfully',
        data: {
          metrics,
        },
      });
    }
  );
}
