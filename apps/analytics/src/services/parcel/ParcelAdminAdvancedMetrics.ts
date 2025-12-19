import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { Request, RequestHandler, Response } from 'express';
import { Parcel } from '../../models/parcel/ParcelModel';
import { ParcelStatus } from '../../models/parcel/schemas/trackingHistorySchema';

export class ParcelAdminAdvancedMetrics {
  static findPaymentTypeMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { from, to } = req.query;

      let start = new Date();
      let end = new Date();

      if (from && to) {
        start = new Date(String(from));
        end = new Date(String(to));
      } else {
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const metrics = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $densify: {
            field: 'createdAt',
            range: {
              step: 1,
              unit: 'day',
              bounds: [start, end],
            },
          },
        },
        {
          $project: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
            method: '$payment.method',
            amount: { $ifNull: ['$payment.amount', 0] },
          },
        },
        {
          $group: {
            _id: '$date',
            Prepaid: {
              $sum: {
                $cond: [{ $eq: ['$method', 'Prepaid'] }, '$amount', 0],
              },
            },
            COD: {
              $sum: {
                $cond: [{ $eq: ['$method', 'COD'] }, '$amount', 0],
              },
            },
          },
        },
        {
          $project: {
            date: '$_id',
            Prepaid: { $round: ['$Prepaid', 2] },
            COD: { $round: ['$COD', 2] },
            _id: 0,
          },
        },
        {
          $sort: { date: 1 },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Parcel payment metrics retrieved successfully',
        data: {
          metrics,
        },
      });
    }
  );

  static findStatusDistributionMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { from, to } = req.query;

      let start = new Date();
      let end = new Date();

      if (from && to) {
        start = new Date(from as string);
        end = new Date(to as string);
      } else {
        start = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate()
        );
        end = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate() + 1
        );
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const chartData = await Parcel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lte: end,
            },
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
            statusData: [
              {
                $match: {
                  _id: { $ne: null },
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
                  ParcelStatus.BOOKED,
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
                          case: { $eq: ['$$status', ParcelStatus.BOOKED] },
                          then: 'var(--chart-1)',
                        },
                        {
                          case: { $eq: ['$$status', ParcelStatus.ASSIGNED] },
                          then: 'var(--chart-2)',
                        },
                        {
                          case: { $eq: ['$$status', ParcelStatus.PICKED_UP] },
                          then: 'var(--chart-3)',
                        },
                        {
                          case: { $eq: ['$$status', ParcelStatus.IN_TRANSIT] },
                          then: 'var(--chart-4)',
                        },
                        {
                          case: { $eq: ['$$status', ParcelStatus.DELIVERED] },
                          then: 'var(--chart-5)',
                        },
                        {
                          case: { $eq: ['$$status', ParcelStatus.FAILED] },
                          then: 'var(--destructive)',
                        },
                      ],
                      default: 'var(--chart-1)',
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
        message: 'Status distribution metrics retrieved successfully',
        data: {
          metrics,
        },
      });
    }
  );

  static findStatusMonthlyMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { from, to } = req.query;

      let start = new Date();
      let end = new Date();

      if (from && to) {
        start = new Date(String(from));
        end = new Date(String(to));
      } else {
        start = new Date(start.getFullYear(), 0, 1);
        end = new Date(start.getFullYear(), 11, 31);
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const metrics = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $densify: {
            field: 'createdAt',
            range: {
              step: 1,
              unit: 'month',
              bounds: [start, end],
            },
          },
        },
        {
          $project: {
            month: {
              $month: '$createdAt',
            },
            status: '$status',
          },
        },
        {
          $group: {
            _id: {
              month: '$month',
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.month',
            data: {
              $push: {
                status: '$_id.status',
                count: '$count',
              },
            },
          },
        },
        {
          $project: {
            month: '$_id',
            Booked: {
              $let: {
                vars: {
                  found: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$data',
                          as: 'item',
                          cond: { $eq: ['$$item.status', ParcelStatus.BOOKED] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ['$$found.count', 0] },
              },
            },
            Assigned: {
              $let: {
                vars: {
                  found: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$data',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.status', ParcelStatus.ASSIGNED],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ['$$found.count', 0] },
              },
            },
            PickedUp: {
              $let: {
                vars: {
                  found: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$data',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.status', ParcelStatus.PICKED_UP],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ['$$found.count', 0] },
              },
            },
            InTransit: {
              $let: {
                vars: {
                  found: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$data',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.status', ParcelStatus.IN_TRANSIT],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ['$$found.count', 0] },
              },
            },
            Delivered: {
              $let: {
                vars: {
                  found: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$data',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.status', ParcelStatus.DELIVERED],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: { $ifNull: ['$$found.count', 0] },
              },
            },
            Failed: {
              $let: {
                vars: {
                  found: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$data',
                          as: 'item',
                          cond: { $eq: ['$$item.status', ParcelStatus.FAILED] },
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
        {
          $addFields: {
            monthName: {
              $switch: {
                branches: [
                  { case: { $eq: ['$month', 1] }, then: 'January' },
                  { case: { $eq: ['$month', 2] }, then: 'February' },
                  { case: { $eq: ['$month', 3] }, then: 'March' },
                  { case: { $eq: ['$month', 4] }, then: 'April' },
                  { case: { $eq: ['$month', 5] }, then: 'May' },
                  { case: { $eq: ['$month', 6] }, then: 'June' },
                  { case: { $eq: ['$month', 7] }, then: 'July' },
                  { case: { $eq: ['$month', 8] }, then: 'August' },
                  { case: { $eq: ['$month', 9] }, then: 'September' },
                  { case: { $eq: ['$month', 10] }, then: 'October' },
                  { case: { $eq: ['$month', 11] }, then: 'November' },
                  { case: { $eq: ['$month', 12] }, then: 'December' },
                ],
                default: 'Unknown',
              },
            },
          },
        },
        {
          $sort: { month: 1 },
        },
        {
          $project: {
            month: '$monthName',
            Booked: 1,
            Assigned: 1,
            PickedUp: 1,
            InTransit: 1,
            Delivered: 1,
            Failed: 1,
          },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Monthly status metrics retrieved successfully',
        data: {
          metrics,
        },
      });
    }
  );

  static findProfitLossMonthlyMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { from, to } = req.query;

      let start = new Date();
      let end = new Date();

      if (from && to) {
        start = new Date(String(from));
        end = new Date(String(to));
      } else {
        start = new Date(start.getFullYear(), 0, 1);
        end = new Date(start.getFullYear(), 11, 31);
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const metrics = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: { $in: [ParcelStatus.DELIVERED, ParcelStatus.FAILED] },
          },
        },
        {
          $densify: {
            field: 'createdAt',
            range: {
              step: 1,
              unit: 'month',
              bounds: [start, end],
            },
          },
        },
        {
          $project: {
            month: {
              $month: '$createdAt',
            },
            status: '$status',
            amount: { $ifNull: ['$payment.amount', 0] },
          },
        },
        {
          $group: {
            _id: '$month',
            profit: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ParcelStatus.DELIVERED] },
                  { $multiply: ['$amount', 0.75] },
                  0,
                ],
              },
            },
            lose: {
              $sum: {
                $cond: [
                  { $eq: ['$status', ParcelStatus.FAILED] },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            month: '$_id',
            profit: { $round: ['$profit', 2] },
            lose: { $round: ['$lose', 2] },
            _id: 0,
          },
        },
        {
          $addFields: {
            monthName: {
              $switch: {
                branches: [
                  { case: { $eq: ['$month', 1] }, then: 'January' },
                  { case: { $eq: ['$month', 2] }, then: 'February' },
                  { case: { $eq: ['$month', 3] }, then: 'March' },
                  { case: { $eq: ['$month', 4] }, then: 'April' },
                  { case: { $eq: ['$month', 5] }, then: 'May' },
                  { case: { $eq: ['$month', 6] }, then: 'June' },
                  { case: { $eq: ['$month', 7] }, then: 'July' },
                  { case: { $eq: ['$month', 8] }, then: 'August' },
                  { case: { $eq: ['$month', 9] }, then: 'September' },
                  { case: { $eq: ['$month', 10] }, then: 'October' },
                  { case: { $eq: ['$month', 11] }, then: 'November' },
                  { case: { $eq: ['$month', 12] }, then: 'December' },
                ],
                default: 'Unknown',
              },
            },
          },
        },
        {
          $sort: { month: 1 },
        },
        {
          $project: {
            month: '$monthName',
            profit: 1,
            lose: 1,
          },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Monthly profit/loss metrics retrieved successfully',
        data: {
          metrics,
        },
      });
    }
  );

  static findProfitLossMetrics: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { from, to } = req.query;

      let start = new Date();
      let end = new Date();

      if (from && to) {
        start = new Date(String(from));
        end = new Date(String(to));
      } else {
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const metrics = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalParcels: { $sum: 1 },
                  deliveredRevenue: {
                    $sum: {
                      $cond: [
                        { $eq: ['$status', ParcelStatus.DELIVERED] },
                        '$payment.amount',
                        0,
                      ],
                    },
                  },
                  failedRevenue: {
                    $sum: {
                      $cond: [
                        { $eq: ['$status', ParcelStatus.FAILED] },
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
                  failedParcels: {
                    $sum: {
                      $cond: [{ $eq: ['$status', ParcelStatus.FAILED] }, 1, 0],
                    },
                  },
                },
              },
              {
                $project: {
                  totalParcels: { $ifNull: ['$totalParcels', 0] },
                  profit: {
                    $multiply: [{ $ifNull: ['$deliveredRevenue', 0] }, 0.75],
                  },
                  lose: { $ifNull: ['$failedRevenue', 0] },
                  successRate: {
                    $cond: [
                      { $eq: ['$totalParcels', 0] },
                      0,
                      {
                        $multiply: [
                          { $divide: ['$deliveredParcels', '$totalParcels'] },
                          100,
                        ],
                      },
                    ],
                  },
                },
              },
              {
                $project: {
                  totalParcels: 1,
                  profit: { $round: ['$profit', 2] },
                  lose: { $round: ['$lose', 2] },
                  successRate: { $round: ['$successRate', 1] },
                },
              },
            ],
            totalParcelsTimeline: [
              {
                $densify: {
                  field: 'createdAt',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [start, end],
                  },
                },
              },
              {
                $project: {
                  date: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                    },
                  },
                },
              },
              {
                $group: {
                  _id: '$date',
                  totalParcels: { $sum: 1 },
                },
              },
              {
                $project: {
                  date: '$_id',
                  totalParcels: 1,
                  _id: 0,
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
            profitTimeline: [
              {
                $match: {
                  status: ParcelStatus.DELIVERED,
                },
              },
              {
                $densify: {
                  field: 'createdAt',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [start, end],
                  },
                },
              },
              {
                $project: {
                  date: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                    },
                  },
                  amount: { $ifNull: ['$payment.amount', 0] },
                },
              },
              {
                $group: {
                  _id: '$date',
                  profit: {
                    $sum: { $multiply: ['$amount', 0.75] },
                  },
                },
              },
              {
                $project: {
                  date: '$_id',
                  profit: { $round: ['$profit', 2] },
                  _id: 0,
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
            loseTimeline: [
              {
                $match: {
                  status: ParcelStatus.FAILED,
                },
              },
              {
                $densify: {
                  field: 'createdAt',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [start, end],
                  },
                },
              },
              {
                $project: {
                  date: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                    },
                  },
                  amount: { $ifNull: ['$payment.amount', 0] },
                },
              },
              {
                $group: {
                  _id: '$date',
                  lose: { $sum: '$amount' },
                },
              },
              {
                $project: {
                  date: '$_id',
                  lose: { $round: ['$lose', 2] },
                  _id: 0,
                },
              },
              {
                $sort: { date: 1 },
              },
            ],
            successRateTimeline: [
              {
                $densify: {
                  field: 'createdAt',
                  range: {
                    step: 1,
                    unit: 'day',
                    bounds: [start, end],
                  },
                },
              },
              {
                $project: {
                  date: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                    },
                  },
                  status: '$status',
                },
              },
              {
                $group: {
                  _id: '$date',
                  totalParcels: { $sum: 1 },
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
                  date: '$_id',
                  successRate: {
                    $cond: [
                      { $eq: ['$totalParcels', 0] },
                      0,
                      {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: ['$deliveredParcels', '$totalParcels'],
                              },
                              100,
                            ],
                          },
                          1,
                        ],
                      },
                    ],
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
            summary: { $arrayElemAt: ['$summary', 0] },
            totalParcelsTimeline: '$totalParcelsTimeline',
            profitTimeline: '$profitTimeline',
            loseTimeline: '$loseTimeline',
            successRateTimeline: '$successRateTimeline',
          },
        },
      ]);

      const result = metrics[0] || {
        summary: {
          totalParcels: 0,
          profit: 0,
          lose: 0,
          successRate: 0,
        },
        totalParcelsTimeline: [],
        profitTimeline: [],
        loseTimeline: [],
        successRateTimeline: [],
      };

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Profit/loss metrics retrieved successfully',
        data: {
          metrics: result,
        },
      });
    }
  );
}
