import { ApiError } from '@server/middlewares';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import bwipjs from 'bwip-js';
import { Request, RequestHandler, Response } from 'express';
import { Model, Types } from 'mongoose';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
import { IParcel } from '../models/parcel/types';

export class ParcelCustomerServices {
  protected readonly model: Model<IParcel>;

  constructor(options: { model: Model<IParcel> }) {
    this.model = options.model;
  }

  public create: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const trackingNumber = `SKU-${nanoid(8)}`;

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

      const payload = {
        ...req.body,
        customer: new Types.ObjectId(req.self._id),
        barcode: `data:image/png;base64,${barcodeBase64}`,
        trackingNumber: trackingNumber,
        qrCode: qrCodeBase64,
      };

      await this.model.create(payload);

      res.status(HttpStatusCode.CREATED).json({
        status: Status.SUCCESS,
        message: 'Parcel created successfully.',
      });
    }
  );
}
