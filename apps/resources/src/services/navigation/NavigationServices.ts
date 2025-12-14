import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import axios from 'axios';
import { Request, RequestHandler, Response } from 'express';

export class NavigationServices {
  public static FindNavigate: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const start: [number, number] = [23.8614, 90.012];
      const end: [number, number] = [23.8103, 90.4125];

      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdjZmM3ZTMyOTdmMTRlMDRhZDE5YmIwMzY0YTQ0Mzc4IiwiaCI6Im11cm11cjY0In0=&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;

      const response = await axios.get(url);
      const routeData = response.data;

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Route fetched successfully',
        data: routeData,
      });
    }
  );

  static FindDuration: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { startLng, startLat, endLng, endLat } = req.query;

      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`;

      const response = await axios.get(osrmUrl);
      const route = response.data.routes[0];

      const distanceMiles = +(route.distance * 0.000621371).toFixed(2);

      const totalMinutes = Math.round(route.duration / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const durationFormatted = `${
        hours > 0 ? hours + ' hour ' : ''
      }${minutes} min`;

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Duration fetched successfully',
        data: {
          distance: `${distanceMiles} miles`,
          duration: durationFormatted,
        },
      });
    }
  );
}
