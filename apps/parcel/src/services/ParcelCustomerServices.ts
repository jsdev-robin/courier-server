import { APIFeatures } from '@server/features';
import { ApiError } from '@server/middlewares';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import bwipjs from 'bwip-js';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import mongoose, { Model, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import { ParcelStatus } from '../models/parcel/schemas/trackingHistorySchema';
import { IParcel } from '../models/parcel/types';

export class ParcelCustomerServices {
  protected readonly model: Model<IParcel>;

  constructor(options: { model: Model<IParcel> }) {
    this.model = options.model;
  }

  public create: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const trackingNumber = `TRK-${nanoid(8)}`;

      const [barcodeBuffer, qrCodeBase64] = await Promise.all([
        bwipjs.toBuffer({
          bcid: 'code128',
          text: trackingNumber,
          scale: 3,
          height: 10,
          includetext: true,
          textxalign: 'center',
          backgroundcolor: '#22c55e',
        }),
        QRCode.toDataURL(trackingNumber),
      ]).catch(() => {
        throw new ApiError(
          'Failed to generate barcode or QR code',
          HttpStatusCode.INTERNAL_SERVER_ERROR
        );
      });

      const barcodeBase64 = barcodeBuffer.toString('base64');

      const trackingHistory = [
        {
          status: ParcelStatus.BOOKED,
          timestamp: new Date(),
          notes: 'Parcel booked',
        },
      ];

      const payload = {
        ...req.body,
        customer: new Types.ObjectId(req.self._id),
        barcode: `data:image/png;base64,${barcodeBase64}`,
        trackingNumber: trackingNumber,
        qrCode: qrCodeBase64,
        trackingHistory,
      };

      await this.model.create(payload);

      res.status(HttpStatusCode.CREATED).json({
        status: Status.SUCCESS,
        message: 'Parcel created successfully.',
      });
    }
  );

  public find: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const features = await new APIFeatures<IParcel>(this.model, {
        ...req.query,
        customer: String(req.self._id),
      })
        .filter()
        .paginate()
        .sort()
        .globalSearch(['basicInfo.title'])
        .limitFields('-qrCode -barcode')
        .populate({
          path: 'assignedAgent',
          select: 'personalInfo',
        });

      const { data, total } = await features.exec();

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'All product retrieved successfully',
        data: {
          parcels: data,
          total,
        },
      });
    }
  );

  public findOne: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const result = await this.model.aggregate([
        {
          $match: {
            $and: [
              { _id: new mongoose.Types.ObjectId(req.params.id) },
              { customer: new mongoose.Types.ObjectId(req.self._id) },
            ],
          },
        },
        {
          $lookup: {
            from: 'agents',
            localField: 'assignedAgent',
            foreignField: '_id',
            as: 'agentData',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'customer',
            foreignField: '_id',
            as: 'customerData',
          },
        },
        {
          $unwind: {
            path: '$agentData',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$customerData',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $addFields: {
            assignedAgent: {
              $cond: {
                if: { $gt: ['$agentData', null] },
                then: { personalInfo: '$agentData.personalInfo' },
                else: null,
              },
            },
            customer: {
              $cond: {
                if: { $gt: ['$customerData', null] },
                then: { personalInfo: '$customerData.personalInfo' },
                else: null,
              },
            },
          },
        },
        {
          $project: {
            agentData: 0,
            customerData: 0,
          },
        },
      ]);

      if (!result || result.length === 0) {
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
        data: { parcel: result[0] },
      });
    }
  );
}
