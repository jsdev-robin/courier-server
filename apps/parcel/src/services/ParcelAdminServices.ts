import { APIFeatures } from '@server/features';
import { ApiError } from '@server/middlewares';
import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import bwipjs from 'bwip-js';
import ExcelJS from 'exceljs';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Model } from 'mongoose';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

import { IUser } from '@server/types';
import { IParcel } from '../models/parcel/types';

export class ParcelAdminServices {
  protected readonly model: Model<IParcel>;

  constructor(options: { model: Model<IParcel> }) {
    this.model = options.model;
  }

  private async generateQRCode(text: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(text, { width: 100 });
    } catch {
      return Buffer.alloc(1);
    }
  }

  private async generateBarcode(text: string): Promise<Buffer> {
    try {
      const svg = await bwipjs.toBuffer({
        bcid: 'code128',
        text: text,
        scale: 2,
        height: 10,
        includetext: false,
      });
      return svg;
    } catch {
      return Buffer.alloc(1);
    }
  }

  public find: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      console.log(req.query);

      const features = await new APIFeatures<IParcel>(this.model, {
        ...req.query,
      })
        .filter()
        .paginate()
        .sort()
        .globalSearch(['basicInfo.title'])
        .limitFields('-qrCode')
        .populate({
          path: 'assignedAgent',
          select: 'personalInfo',
        })
        .populate({
          path: 'customer',
          select: 'personalInfo',
        });

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

  public findById: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const parcel = await this.model
        .findById(req.params.id)
        .populate({
          path: 'assignedAgent',
          select: 'personalInfo',
        })
        .populate({
          path: 'customer',
          select: 'personalInfo',
        });
      if (!parcel) {
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
        data: { parcel },
      });
    }
  );

  public findOneAndExportPdf: RequestHandler = catchAsync(
    async (req, res, next) => {
      const parcel = await this.model
        .findById(req.params.id)
        .populate<{ customer: IUser }>('customer')
        .populate<{ assignedAgent: IUser }>('assignedAgent');

      if (!parcel) {
        return next(new ApiError('Parcel not found', HttpStatusCode.NOT_FOUND));
      }

      const doc = new PDFDocument({
        margin: 20,
        size: 'A4',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="invoice-${parcel.trackingNumber}.pdf"`
      );
      doc.pipe(res);

      const headerColor = '#2c5282';

      doc.rect(0, 0, doc.page.width, 40).fill(headerColor);
      doc
        .fillColor('#fff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('INVOICE', 20, 12);

      const currentDate = new Date().toLocaleDateString();
      doc
        .fontSize(8)
        .text(`Invoice: INV-${parcel.trackingNumber}`, 420, 12)
        .text(`Date: ${currentDate}`, 420, 24);

      const leftCol = 20;
      const rightCol = 260;
      let y = 55;

      const customer = parcel.customer;
      const customerName =
        customer?.personalInfo?.displayName ||
        `${customer?.personalInfo?.givenName || ''} ${
          customer?.personalInfo?.familyName || ''
        }`.trim() ||
        'Customer';

      doc
        .fillColor(headerColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('FROM', leftCol, y);
      doc
        .fillColor('#333')
        .fontSize(8)
        .font('Helvetica')
        .text(customerName, leftCol, y + 12)
        .text(customer?.personalInfo?.email || '', leftCol, y + 24)
        .text(customer?.personalInfo?.phone || '', leftCol, y + 36);

      const address = parcel.deliveryAddress;
      doc
        .fillColor(headerColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('TO', rightCol, y);
      doc
        .fillColor('#333')
        .fontSize(8)
        .font('Helvetica')
        .text(address.contactName, rightCol, y + 12)
        .text(address.street, rightCol, y + 24)
        .text(`${address.city}, ${address.state}`, rightCol, y + 36)
        .text(`Phone: ${address.contactPhone}`, rightCol, y + 48);

      y = 120;

      doc
        .fillColor(headerColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('PARCEL DETAILS', leftCol, y);

      y += 12;

      const tableLeft = leftCol;
      const tableWidth = 520;
      const colWidths = [100, 90, 70, 70, 80];
      const rowHeight = 18;

      doc.fillColor('#fff');
      doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#2c5282');

      doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
      ['Description', 'Category', 'Size', 'Weight', 'Amount'].forEach(
        (text, i) => {
          doc.text(
            text,
            tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 5,
            y + 5
          );
        }
      );

      y += rowHeight;

      doc.rect(tableLeft, y, tableWidth, rowHeight).stroke('#ddd');
      doc.fillColor('#333').font('Helvetica').fontSize(8);

      const parcelData = [
        parcel.parcelDetails.description || 'Parcel Delivery',
        parcel.parcelDetails.category,
        parcel.parcelDetails.size,
        `${parcel.parcelDetails.weight} kg`,
        `$${parcel.payment.amount.toFixed(2)}`,
      ];

      parcelData.forEach((text, i) => {
        doc.text(
          text,
          tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 5,
          y + 5,
          { width: colWidths[i] - 10 }
        );
      });

      y += rowHeight + 15;

      doc
        .fillColor(headerColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('PAYMENT DETAILS', leftCol, y);

      y += 12;

      const paymentColWidths = [90, 90, 110, 90];

      doc.fillColor('#fff');
      doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#2c5282');

      doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
      ['Method', 'Status', 'COD Amount', 'Total'].forEach((text, i) => {
        doc.text(
          text,
          tableLeft +
            paymentColWidths.slice(0, i).reduce((a, b) => a + b, 0) +
            5,
          y + 5
        );
      });

      y += rowHeight;

      doc.rect(tableLeft, y, tableWidth, rowHeight).stroke('#ddd');

      const statusColor =
        parcel.payment.status === 'Paid'
          ? '#38a169'
          : parcel.payment.status === 'Pending'
          ? '#d69e2e'
          : '#e53e3e';

      doc.fillColor('#333').font('Helvetica').fontSize(8);
      doc.text(parcel.payment.method, tableLeft + 5, y + 5);

      doc.fillColor(statusColor);
      doc.text(
        parcel.payment.status,
        tableLeft + paymentColWidths[0] + 5,
        y + 5
      );

      doc.fillColor('#333');
      doc.text(
        `$${parcel.payment.codAmount?.toFixed(2) || '0.00'}`,
        tableLeft + paymentColWidths[0] + paymentColWidths[1] + 5,
        y + 5
      );

      doc.text(
        `$${parcel.payment.amount.toFixed(2)}`,
        tableLeft +
          paymentColWidths[0] +
          paymentColWidths[1] +
          paymentColWidths[2] +
          5,
        y + 5
      );

      y += rowHeight + 15;

      const [qrCode, barcode] = await Promise.all([
        this.generateQRCode(parcel.trackingNumber),
        this.generateBarcode(parcel.trackingNumber),
      ]);

      if (qrCode.length) {
        doc.image(qrCode, leftCol, y, { width: 50, height: 50 });
      }

      if (barcode.length) {
        doc.image(barcode, leftCol + 70, y + 5, {
          width: 180,
          height: 30,
        });
      }

      y += 70;

      const agent = parcel.assignedAgent;
      const agentName =
        agent?.personalInfo?.displayName ||
        `${agent?.personalInfo?.givenName || ''} ${
          agent?.personalInfo?.familyName || ''
        }`.trim();

      if (agentName && y < 650) {
        doc
          .fontSize(7)
          .fillColor('#666')
          .text(`Agent: ${agentName}`, leftCol, y);
        y += 10;
      }

      if (y < 650) {
        doc
          .fontSize(7)
          .fillColor('#999')
          .text('Thank you for choosing our service', leftCol, y)
          .text(
            'For support: support@logistics.com | Phone: (123) 456-7890',
            leftCol,
            y + 10
          );
      }

      doc.end();
    }
  );

  public findAllExportExcel: RequestHandler = catchAsync(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const parcels = await this.model
        .find()
        .populate<{ assignedAgent: IUser }>({
          path: 'assignedAgent',
          select: 'personalInfo',
        })
        .populate<{ customer: IUser }>({
          path: 'customer',
          select: 'personalInfo',
        })
        .lean();

      if (!parcels || parcels.length === 0) {
        return next(
          new ApiError('No parcels found for export.', HttpStatusCode.NOT_FOUND)
        );
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Parcels');

      worksheet.columns = [
        { header: 'Tracking Number', key: 'trackingNumber', width: 20 },
        { header: 'Customer Name', key: 'customerName', width: 25 },
        { header: 'Customer Email', key: 'customerEmail', width: 25 },
        { header: 'Customer Phone', key: 'customerPhone', width: 15 },
        { header: 'Assigned Agent', key: 'agentName', width: 25 },
        { header: 'Street', key: 'street', width: 30 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'Country', key: 'country', width: 15 },
        { header: 'Postal Code', key: 'postalCode', width: 10 },
        { header: 'Contact Name', key: 'contactName', width: 20 },
        { header: 'Contact Phone', key: 'contactPhone', width: 15 },
        { header: 'Parcel Size', key: 'parcelSize', width: 15 },
        { header: 'Weight (kg)', key: 'weight', width: 12 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Description', key: 'description', width: 25 },
        { header: 'Payment Method', key: 'paymentMethod', width: 15 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'COD Amount', key: 'codAmount', width: 12 },
        { header: 'Payment Status', key: 'paymentStatus', width: 15 },
        { header: 'Parcel Status', key: 'status', width: 15 },
        { header: 'Created Date', key: 'createdAt', width: 20 },
        { header: 'Updated Date', key: 'updatedAt', width: 20 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2c5282' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      parcels.forEach((parcel: any) => {
        const customerName = parcel.customer
          ? `${parcel.customer.personalInfo?.givenName || ''} ${
              parcel.customer.personalInfo?.familyName || ''
            }`.trim()
          : '';

        const agentName = parcel.assignedAgent
          ? `${parcel.assignedAgent.personalInfo?.givenName || ''} ${
              parcel.assignedAgent.personalInfo?.familyName || ''
            }`.trim()
          : '';

        worksheet.addRow({
          trackingNumber: parcel.trackingNumber,
          customerName: customerName,
          customerEmail: parcel.customer?.personalInfo?.email || '',
          customerPhone: parcel.customer?.personalInfo?.phone || '',
          agentName: agentName,
          street: parcel.deliveryAddress.street,
          city: parcel.deliveryAddress.city,
          state: parcel.deliveryAddress.state,
          country: parcel.deliveryAddress.country,
          postalCode: parcel.deliveryAddress.postalCode,
          contactName: parcel.deliveryAddress.contactName,
          contactPhone: parcel.deliveryAddress.contactPhone,
          parcelSize: parcel.parcelDetails.size,
          weight: parcel.parcelDetails.weight,
          category: parcel.parcelDetails.category,
          description: parcel.parcelDetails.description || '',
          paymentMethod: parcel.payment.method,
          amount: parcel.payment.amount,
          codAmount: parcel.payment.codAmount || 0,
          paymentStatus: parcel.payment.status,
          status: parcel.status,
          createdAt: parcel.createdAt
            ? new Date(parcel.createdAt).toLocaleString()
            : '',
          updatedAt: parcel.updatedAt
            ? new Date(parcel.updatedAt).toLocaleString()
            : '',
        });
      });

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle' };
          row.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        }
      });

      const fileName = `parcels_export_${Date.now()}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`
      );

      await workbook.xlsx.write(res);
      res.end();
    }
  );
}
