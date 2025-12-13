import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import { Request, RequestHandler, Response } from 'express';
import { Parcel, ParcelStatus } from '../../models/parcel/ParcelModel';

export class ParcelServices {
  public findStatusStats: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const chartData = await Parcel.aggregate([
        {
          $group: {
            _id: '$payment.status',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            paymentStatus: {
              $toLower: '$_id',
            },
            count: 1,
            fill: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ['$_id', 'Pending'] },
                    then: 'var(--chart-1)',
                  },
                  {
                    case: { $eq: ['$_id', 'Paid'] },
                    then: 'var(--chart-2)',
                  },
                  {
                    case: { $eq: ['$_id', 'Failed'] },
                    then: 'var(--chart-3)',
                  },
                ],
                default: 'var(--chart-4)',
              },
            },
            _id: 0,
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      const chartConfig = {
        count: {
          label: 'Parcels',
        },
        pending: {
          label: 'Pending',
          color: 'var(--chart-1)',
        },
        paid: {
          label: 'Paid',
          color: 'var(--chart-2)',
        },
        failed: {
          label: 'Failed',
          color: 'var(--chart-3)',
        },
        other: {
          label: 'Other',
          color: 'var(--chart-4)',
        },
      };

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Payment status stats retrieved successfully',
        data: {
          chartData,
          chartConfig,
        },
      });
    }
  );

  public findPaymentTypeStats: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const chartData = await Parcel.aggregate([
        {
          $match: {
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: '$payment.type',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            paymentType: '$_id',
            count: 1,
            fill: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id', 'COD'] }, then: 'var(--chart-1)' },
                  {
                    case: { $eq: ['$_id', 'Prepaid'] },
                    then: 'var(--chart-2)',
                  },
                ],
                default: 'var(--chart-3)',
              },
            },
            _id: 0,
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: "Today's payment type stats retrieved successfully",
        data: { chartData },
      });
    }
  );

  // public findOverviewStats: RequestHandler = catchAsync(
  //   async (req: Request, res: Response): Promise<void> => {
  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0);

  //     const yesterday = new Date(today);
  //     yesterday.setDate(yesterday.getDate() - 1);

  //     const twoDaysAgo = new Date(today);
  //     twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  //     const result = await Parcel.aggregate([
  //       {
  //         $facet: {
  //           todayStats: [
  //             {
  //               $match: {
  //                 createdAt: { $gte: today },
  //               },
  //             },
  //             {
  //               $group: {
  //                 _id: null,
  //                 parcels: { $sum: 1 },
  //                 revenue: { $sum: '$payment.amount' },
  //                 codCount: {
  //                   $sum: { $cond: [{ $eq: ['$payment.type', 'COD'] }, 1, 0] },
  //                 },
  //                 codAmount: {
  //                   $sum: {
  //                     $cond: [
  //                       { $eq: ['$payment.type', 'COD'] },
  //                       '$payment.codAmount',
  //                       0,
  //                     ],
  //                   },
  //                 },
  //                 delivered: {
  //                   $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
  //                 },
  //                 failed: {
  //                   $sum: { $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0] },
  //                 },
  //               },
  //             },
  //           ],
  //           yesterdayStats: [
  //             {
  //               $match: {
  //                 createdAt: { $gte: yesterday, $lt: today },
  //               },
  //             },
  //             {
  //               $group: {
  //                 _id: null,
  //                 parcels: { $sum: 1 },
  //                 revenue: { $sum: '$payment.amount' },
  //                 codCount: {
  //                   $sum: { $cond: [{ $eq: ['$payment.type', 'COD'] }, 1, 0] },
  //                 },
  //                 codAmount: {
  //                   $sum: {
  //                     $cond: [
  //                       { $eq: ['$payment.type', 'COD'] },
  //                       '$payment.codAmount',
  //                       0,
  //                     ],
  //                   },
  //                 },
  //                 delivered: {
  //                   $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
  //                 },
  //                 failed: {
  //                   $sum: { $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0] },
  //                 },
  //               },
  //             },
  //           ],
  //           previousStats: [
  //             {
  //               $match: {
  //                 createdAt: { $gte: twoDaysAgo, $lt: yesterday },
  //               },
  //             },
  //             {
  //               $group: {
  //                 _id: null,
  //                 parcels: { $sum: 1 },
  //                 revenue: { $sum: '$payment.amount' },
  //                 codAmount: {
  //                   $sum: {
  //                     $cond: [
  //                       { $eq: ['$payment.type', 'COD'] },
  //                       '$payment.codAmount',
  //                       0,
  //                     ],
  //                   },
  //                 },
  //                 delivered: {
  //                   $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] },
  //                 },
  //                 failed: {
  //                   $sum: { $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0] },
  //                 },
  //               },
  //             },
  //           ],
  //         },
  //       },
  //       {
  //         $project: {
  //           todayData: { $arrayElemAt: ['$todayStats', 0] },
  //           yesterdayData: { $arrayElemAt: ['$yesterdayStats', 0] },
  //           previousData: { $arrayElemAt: ['$previousStats', 0] },
  //         },
  //       },
  //       {
  //         $project: {
  //           todayParcels: { $ifNull: ['$todayData.parcels', 0] },
  //           todayRevenue: { $ifNull: ['$todayData.revenue', 0] },
  //           todayCodOrders: { $ifNull: ['$todayData.codCount', 0] },
  //           todayCodAmount: { $ifNull: ['$todayData.codAmount', 0] },
  //           todayDelivered: { $ifNull: ['$todayData.delivered', 0] },
  //           todayFailed: { $ifNull: ['$todayData.failed', 0] },

  //           yesterdayParcels: { $ifNull: ['$yesterdayData.parcels', 0] },
  //           yesterdayRevenue: { $ifNull: ['$yesterdayData.revenue', 0] },
  //           yesterdayCodAmount: { $ifNull: ['$yesterdayData.codAmount', 0] },
  //           yesterdayDelivered: { $ifNull: ['$yesterdayData.delivered', 0] },
  //           yesterdayFailed: { $ifNull: ['$yesterdayData.failed', 0] },

  //           previousParcels: { $ifNull: ['$previousData.parcels', 0] },
  //           previousRevenue: { $ifNull: ['$previousData.revenue', 0] },
  //           previousCodAmount: { $ifNull: ['$previousData.codAmount', 0] },
  //           previousDelivered: { $ifNull: ['$previousData.delivered', 0] },
  //           previousFailed: { $ifNull: ['$previousData.failed', 0] },
  //         },
  //       },
  //       {
  //         $project: {
  //           todayParcels: 1,
  //           todayCodAmount: 1,
  //           todayRevenue: 1,
  //           todayCodOrders: 1,
  //           todayDelivered: 1,
  //           todayFailed: 1,

  //           revenueChart: [
  //             {
  //               revenue: '$todayRevenue',
  //               growth: {
  //                 $cond: {
  //                   if: { $gt: ['$yesterdayRevenue', 0] },
  //                   then: {
  //                     $round: [
  //                       {
  //                         $multiply: [
  //                           {
  //                             $divide: [
  //                               {
  //                                 $subtract: [
  //                                   '$todayRevenue',
  //                                   '$yesterdayRevenue',
  //                                 ],
  //                               },
  //                               '$yesterdayRevenue',
  //                             ],
  //                           },
  //                           100,
  //                         ],
  //                       },
  //                       0,
  //                     ],
  //                   },
  //                   else: {
  //                     $cond: {
  //                       if: { $gt: ['$previousRevenue', 0] },
  //                       then: 100,
  //                       else: 0,
  //                     },
  //                   },
  //                 },
  //               },
  //               fill: 'var(--chart-1)',
  //             },
  //           ],
  //           ordersChart: [
  //             {
  //               orders: '$todayCodOrders',
  //               amount: '$todayCodAmount',
  //               fill: 'var(--chart-3)',
  //             },
  //           ],
  //           ratingChart: [
  //             {
  //               rating: {
  //                 $cond: {
  //                   if: {
  //                     $gt: [{ $add: ['$todayDelivered', '$todayFailed'] }, 0],
  //                   },
  //                   then: {
  //                     $round: [
  //                       {
  //                         $multiply: [
  //                           {
  //                             $divide: [
  //                               '$todayDelivered',
  //                               { $add: ['$todayDelivered', '$todayFailed'] },
  //                             ],
  //                           },
  //                           5,
  //                         ],
  //                       },
  //                       1,
  //                     ],
  //                   },
  //                   else: 0,
  //                 },
  //               },
  //               totalDeliveries: { $add: ['$todayDelivered', '$todayFailed'] },
  //               fill: 'var(--chart-4)',
  //             },
  //           ],
  //           successRate: {
  //             $cond: {
  //               if: {
  //                 $gt: [{ $add: ['$todayDelivered', '$todayFailed'] }, 0],
  //               },
  //               then: {
  //                 $round: [
  //                   {
  //                     $multiply: [
  //                       {
  //                         $divide: [
  //                           '$todayDelivered',
  //                           { $add: ['$todayDelivered', '$todayFailed'] },
  //                         ],
  //                       },
  //                       100,
  //                     ],
  //                   },
  //                   1,
  //                 ],
  //               },
  //               else: 0,
  //             },
  //           },
  //           parcelsGrowth: {
  //             $cond: {
  //               if: { $gt: ['$yesterdayParcels', 0] },
  //               then: {
  //                 $round: [
  //                   {
  //                     $multiply: [
  //                       {
  //                         $divide: [
  //                           {
  //                             $subtract: ['$todayParcels', '$yesterdayParcels'],
  //                           },
  //                           '$yesterdayParcels',
  //                         ],
  //                       },
  //                       100,
  //                     ],
  //                   },
  //                   0,
  //                 ],
  //               },
  //               else: {
  //                 $cond: {
  //                   if: { $gt: ['$previousParcels', 0] },
  //                   then: 100,
  //                   else: 0,
  //                 },
  //               },
  //             },
  //           },
  //           codGrowth: {
  //             $cond: {
  //               if: { $gt: ['$yesterdayCodAmount', 0] },
  //               then: {
  //                 $round: [
  //                   {
  //                     $multiply: [
  //                       {
  //                         $divide: [
  //                           {
  //                             $subtract: [
  //                               '$todayCodAmount',
  //                               '$yesterdayCodAmount',
  //                             ],
  //                           },
  //                           '$yesterdayCodAmount',
  //                         ],
  //                       },
  //                       100,
  //                     ],
  //                   },
  //                   0,
  //                 ],
  //               },
  //               else: {
  //                 $cond: {
  //                   if: { $gt: ['$previousCodAmount', 0] },
  //                   then: 100,
  //                   else: 0,
  //                 },
  //               },
  //             },
  //           },
  //           successRateGrowth: {
  //             $let: {
  //               vars: {
  //                 todaySuccess: {
  //                   $cond: {
  //                     if: {
  //                       $gt: [{ $add: ['$todayDelivered', '$todayFailed'] }, 0],
  //                     },
  //                     then: {
  //                       $divide: [
  //                         '$todayDelivered',
  //                         { $add: ['$todayDelivered', '$todayFailed'] },
  //                       ],
  //                     },
  //                     else: 0,
  //                   },
  //                 },
  //                 yesterdaySuccess: {
  //                   $cond: {
  //                     if: {
  //                       $gt: [
  //                         { $add: ['$yesterdayDelivered', '$yesterdayFailed'] },
  //                         0,
  //                       ],
  //                     },
  //                     then: {
  //                       $divide: [
  //                         '$yesterdayDelivered',
  //                         { $add: ['$yesterdayDelivered', '$yesterdayFailed'] },
  //                       ],
  //                     },
  //                     else: 0,
  //                   },
  //                 },
  //                 previousSuccess: {
  //                   $cond: {
  //                     if: {
  //                       $gt: [
  //                         { $add: ['$previousDelivered', '$previousFailed'] },
  //                         0,
  //                       ],
  //                     },
  //                     then: {
  //                       $divide: [
  //                         '$previousDelivered',
  //                         { $add: ['$previousDelivered', '$previousFailed'] },
  //                       ],
  //                     },
  //                     else: 0,
  //                   },
  //                 },
  //               },
  //               in: {
  //                 $cond: {
  //                   if: { $gt: ['$$yesterdaySuccess', 0] },
  //                   then: {
  //                     $round: [
  //                       {
  //                         $multiply: [
  //                           {
  //                             $divide: [
  //                               {
  //                                 $subtract: [
  //                                   '$$todaySuccess',
  //                                   '$$yesterdaySuccess',
  //                                 ],
  //                               },
  //                               '$$yesterdaySuccess',
  //                             ],
  //                           },
  //                           100,
  //                         ],
  //                       },
  //                       1,
  //                     ],
  //                   },
  //                   else: {
  //                     $cond: {
  //                       if: { $gt: ['$$previousSuccess', 0] },
  //                       then: 100,
  //                       else: 0,
  //                     },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     ]);

  //     const stats = result[0] || {};

  //     res.status(HttpStatusCode.OK).json({
  //       status: Status.SUCCESS,
  //       message: 'Overview stats retrieved successfully',
  //       data: {
  //         todayParcels: stats.todayParcels,
  //         todayCodAmount: stats.todayCodAmount,
  //         successRate: stats.successRate,
  //         parcelsGrowth: Math.min(stats.parcelsGrowth || 0, 100),
  //         codGrowth: Math.min(stats.codGrowth || 0, 100),
  //         successRateGrowth: Math.min(
  //           Math.max(stats.successRateGrowth || 0, -100),
  //           100
  //         ),
  //         revenueChart: stats.revenueChart,
  //         ordersChart: stats.ordersChart,
  //         ratingChart: stats.ratingChart,
  //       },
  //     });
  //   }
  // );

  public findOverviewStats: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));

      const result = await Parcel.aggregate([
        {
          $facet: {
            totalRevenuePaid: [
              { $match: { 'payment.status': 'Paid' } },
              { $group: { _id: null, total: { $sum: '$payment.amount' } } },
            ],
            todayRevenuePaid: [
              {
                $match: {
                  'payment.status': 'Paid',
                  createdAt: { $gte: startOfToday },
                },
              },
              { $group: { _id: null, total: { $sum: '$payment.amount' } } },
            ],
            yesterdayRevenuePaid: [
              {
                $match: {
                  'payment.status': 'Paid',
                  createdAt: { $gte: startOfYesterday, $lt: startOfToday },
                },
              },
              { $group: { _id: null, total: { $sum: '$payment.amount' } } },
            ],
            totalParcelsAll: [{ $group: { _id: null, count: { $sum: 1 } } }],
            todayParcelsAll: [
              { $match: { createdAt: { $gte: startOfToday } } },
              { $group: { _id: null, count: { $sum: 1 } } },
            ],
            yesterdayParcelsAll: [
              {
                $match: {
                  createdAt: { $gte: startOfYesterday, $lt: startOfToday },
                },
              },
              { $group: { _id: null, count: { $sum: 1 } } },
            ],
            todayDeliveredParcels: [
              {
                $match: {
                  status: ParcelStatus.DELIVERED,
                  createdAt: { $gte: startOfToday },
                },
              },
              { $group: { _id: null, count: { $sum: 1 } } },
            ],
            yesterdayDeliveredParcels: [
              {
                $match: {
                  status: ParcelStatus.DELIVERED,
                  createdAt: { $gte: startOfYesterday, $lt: startOfToday },
                },
              },
              { $group: { _id: null, count: { $sum: 1 } } },
            ],
            todayFailedParcels: [
              {
                $match: {
                  status: ParcelStatus.FAILED,
                  createdAt: { $gte: startOfToday },
                },
              },
              { $group: { _id: null, count: { $sum: 1 } } },
            ],
            yesterdayFailedParcels: [
              {
                $match: {
                  status: ParcelStatus.FAILED,
                  createdAt: { $gte: startOfYesterday, $lt: startOfToday },
                },
              },
              { $group: { _id: null, count: { $sum: 1 } } },
            ],
            allParcelsCount: [{ $group: { _id: null, count: { $sum: 1 } } }],
            statusDistribution: [
              { $group: { _id: '$status', count: { $sum: 1 } } },
            ],
            paymentTypeStats: [
              { $group: { _id: '$payment.type', count: { $sum: 1 } } },
            ],
            deliveredAmounts: [
              { $match: { status: ParcelStatus.DELIVERED } },
              { $group: { _id: null, total: { $sum: '$payment.amount' } } },
            ],
            todayDeliveredAmounts: [
              {
                $match: {
                  status: ParcelStatus.DELIVERED,
                  createdAt: { $gte: startOfToday },
                },
              },
              { $group: { _id: null, total: { $sum: '$payment.amount' } } },
            ],
            yesterdayDeliveredAmounts: [
              {
                $match: {
                  status: ParcelStatus.DELIVERED,
                  createdAt: { $gte: startOfYesterday, $lt: startOfToday },
                },
              },
              { $group: { _id: null, total: { $sum: '$payment.amount' } } },
            ],
          },
        },
        {
          $project: {
            totalRevenue: {
              $ifNull: [{ $arrayElemAt: ['$totalRevenuePaid.total', 0] }, 0],
            },
            todayRevenue: {
              $ifNull: [{ $arrayElemAt: ['$todayRevenuePaid.total', 0] }, 0],
            },
            yesterdayRevenue: {
              $ifNull: [
                { $arrayElemAt: ['$yesterdayRevenuePaid.total', 0] },
                0,
              ],
            },
            totalParcels: {
              $ifNull: [{ $arrayElemAt: ['$totalParcelsAll.count', 0] }, 0],
            },
            todayParcels: {
              $ifNull: [{ $arrayElemAt: ['$todayParcelsAll.count', 0] }, 0],
            },
            yesterdayParcels: {
              $ifNull: [{ $arrayElemAt: ['$yesterdayParcelsAll.count', 0] }, 0],
            },
            todayDeliveredCount: {
              $ifNull: [
                { $arrayElemAt: ['$todayDeliveredParcels.count', 0] },
                0,
              ],
            },
            yesterdayDeliveredCount: {
              $ifNull: [
                { $arrayElemAt: ['$yesterdayDeliveredParcels.count', 0] },
                0,
              ],
            },
            todayFailedCount: {
              $ifNull: [{ $arrayElemAt: ['$todayFailedParcels.count', 0] }, 0],
            },
            yesterdayFailedCount: {
              $ifNull: [
                { $arrayElemAt: ['$yesterdayFailedParcels.count', 0] },
                0,
              ],
            },
            allCount: {
              $ifNull: [{ $arrayElemAt: ['$allParcelsCount.count', 0] }, 0],
            },
            deliveredAmount: {
              $ifNull: [{ $arrayElemAt: ['$deliveredAmounts.total', 0] }, 0],
            },
            todayDeliveredAmount: {
              $ifNull: [
                { $arrayElemAt: ['$todayDeliveredAmounts.total', 0] },
                0,
              ],
            },
            yesterdayDeliveredAmount: {
              $ifNull: [
                { $arrayElemAt: ['$yesterdayDeliveredAmounts.total', 0] },
                0,
              ],
            },
            statusDistribution: 1,
            paymentTypeStats: 1,
          },
        },
        {
          $project: {
            totalRevenue: 1,
            todayRevenue: 1,
            yesterdayRevenue: 1,
            totalParcels: 1,
            todayParcels: 1,
            yesterdayParcels: 1,
            todayDeliveredCount: 1,
            yesterdayDeliveredCount: 1,
            todayFailedCount: 1,
            yesterdayFailedCount: 1,
            allCount: 1,
            deliveredAmount: 1,
            todayDeliveredAmount: 1,
            yesterdayDeliveredAmount: 1,
            statusDistribution: 1,
            paymentTypeStats: 1,
            revenueChangeAmount: {
              $subtract: ['$todayRevenue', '$yesterdayRevenue'],
            },
            revenueChangePercent: {
              $cond: {
                if: { $eq: ['$yesterdayRevenue', 0] },
                then: 0,
                else: {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ['$todayRevenue', '$yesterdayRevenue'] },
                        '$yesterdayRevenue',
                      ],
                    },
                    100,
                  ],
                },
              },
            },
            parcelsChangeAmount: {
              $subtract: ['$todayParcels', '$yesterdayParcels'],
            },
            parcelsChangePercent: {
              $cond: {
                if: { $eq: ['$yesterdayParcels', 0] },
                then: 0,
                else: {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ['$todayParcels', '$yesterdayParcels'] },
                        '$yesterdayParcels',
                      ],
                    },
                    100,
                  ],
                },
              },
            },
            successRatePercent: {
              $cond: {
                if: {
                  $eq: [{ $add: ['$todayParcels', '$yesterdayParcels'] }, 0],
                },
                then: 0,
                else: {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $add: [
                            '$todayDeliveredCount',
                            '$yesterdayDeliveredCount',
                          ],
                        },
                        { $add: ['$todayParcels', '$yesterdayParcels'] },
                      ],
                    },
                    100,
                  ],
                },
              },
            },
            failedChangeAmount: {
              $subtract: ['$todayFailedCount', '$yesterdayFailedCount'],
            },
            failedChangePercent: {
              $cond: {
                if: { $eq: ['$yesterdayFailedCount', 0] },
                then: 0,
                else: {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            '$todayFailedCount',
                            '$yesterdayFailedCount',
                          ],
                        },
                        '$yesterdayFailedCount',
                      ],
                    },
                    100,
                  ],
                },
              },
            },
            averageDeliveryValue: {
              $cond: {
                if: {
                  $eq: [
                    {
                      $add: [
                        '$todayDeliveredCount',
                        '$yesterdayDeliveredCount',
                      ],
                    },
                    0,
                  ],
                },
                then: 0,
                else: {
                  $divide: [
                    {
                      $add: [
                        '$todayDeliveredAmount',
                        '$yesterdayDeliveredAmount',
                      ],
                    },
                    {
                      $add: [
                        '$todayDeliveredCount',
                        '$yesterdayDeliveredCount',
                      ],
                    },
                  ],
                },
              },
            },
            averageDeliveryChangeAmount: {
              $subtract: ['$todayDeliveredAmount', '$yesterdayDeliveredAmount'],
            },
            averageDeliveryChangePercent: {
              $cond: {
                if: { $eq: ['$yesterdayDeliveredAmount', 0] },
                then: 0,
                else: {
                  $multiply: [
                    {
                      $divide: [
                        {
                          $subtract: [
                            '$todayDeliveredAmount',
                            '$yesterdayDeliveredAmount',
                          ],
                        },
                        '$yesterdayDeliveredAmount',
                      ],
                    },
                    100,
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            formattedTotalRevenue: {
              $concat: ['$', { $toString: { $round: ['$totalRevenue', 2] } }],
            },
            formattedRevenueChange: {
              amount: {
                $concat: [
                  {
                    $cond: {
                      if: { $gte: ['$revenueChangeAmount', 0] },
                      then: '+',
                      else: '',
                    },
                  },
                  { $toString: { $round: ['$revenueChangeAmount', 2] } },
                ],
              },
              percent: {
                $concat: [
                  '(',
                  {
                    $cond: {
                      if: { $gte: ['$revenueChangePercent', 0] },
                      then: '+',
                      else: '',
                    },
                  },
                  { $toString: { $round: ['$revenueChangePercent', 1] } },
                  '%)',
                ],
              },
            },
            formattedTotalParcels: '$totalParcels',
            formattedParcelsChange: {
              amount: {
                $concat: [
                  {
                    $cond: {
                      if: { $gte: ['$parcelsChangeAmount', 0] },
                      then: '+',
                      else: '',
                    },
                  },
                  { $toString: { $round: ['$parcelsChangeAmount', 0] } },
                ],
              },
              percent: {
                $concat: [
                  '(',
                  {
                    $cond: {
                      if: { $gte: ['$parcelsChangePercent', 0] },
                      then: '+',
                      else: '',
                    },
                  },
                  { $toString: { $round: ['$parcelsChangePercent', 1] } },
                  '%)',
                ],
              },
            },
            formattedSuccessRate: {
              $concat: [
                { $toString: { $round: ['$successRatePercent', 2] } },
                '%',
              ],
            },
            formattedFailedRateChange: {
              amount: {
                $concat: [
                  {
                    $cond: {
                      if: { $gte: ['$failedChangeAmount', 0] },
                      then: '+',
                      else: '',
                    },
                  },
                  { $toString: { $round: ['$failedChangeAmount', 2] } },
                ],
              },
              percent: {
                $concat: [
                  '(',
                  {
                    $cond: {
                      if: { $gte: ['$failedChangePercent', 0] },
                      then: '+',
                      else: '',
                    },
                  },
                  { $toString: { $round: ['$failedChangePercent', 1] } },
                  '%)',
                ],
              },
            },
            formattedAverageDeliveryValue: {
              $concat: [
                '$',
                { $toString: { $round: ['$averageDeliveryValue', 2] } },
              ],
            },
            formattedAverageDeliveryChange: {
              amount: {
                $concat: [
                  {
                    $cond: {
                      if: { $gte: ['$averageDeliveryChangeAmount', 0] },
                      then: '+',
                      else: '',
                    },
                  },
                  {
                    $toString: { $round: ['$averageDeliveryChangeAmount', 2] },
                  },
                ],
              },
              percent: {
                $concat: [
                  '(',
                  {
                    $cond: {
                      if: { $gte: ['$averageDeliveryChangePercent', 0] },
                      then: '+',
                      else: '',
                    },
                  },
                  {
                    $toString: { $round: ['$averageDeliveryChangePercent', 1] },
                  },
                  '%)',
                ],
              },
            },
            statusDistribution: 1,
            paymentTypeStats: 1,
          },
        },
      ]);

      const stats = result[0] || {};

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Overview stats retrieved successfully',
        data: stats,
      });
    }
  );
}
