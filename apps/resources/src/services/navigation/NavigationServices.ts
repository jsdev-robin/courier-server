import { catchAsync, HttpStatusCode, Status } from '@server/utils';
import axios from 'axios';
import { Request, RequestHandler, Response } from 'express';

export class NavigationServices {
  public static FindNavigate: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { startLng, startLat, endLng, endLat } = req.query;

      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdjZmM3ZTMyOTdmMTRlMDRhZDE5YmIwMzY0YTQ0Mzc4IiwiaCI6Im11cm11cjY0In0=&start=${startLng},${startLat}&end=${endLng},${endLat}`;

      const response = await axios.get(url);
      const routeData = response.data;

      const feature = routeData.features[0];

      const polyline = (
        feature.geometry.coordinates as readonly [number, number][]
      ).map(([lng, lat]) => [lat, lng]);

      const steps = feature.properties.segments[0].steps;

      const navigation = steps.map((step: (typeof steps)[number]) => ({
        instruction: step.instruction,
        distance: step.distance,
        duration: step.duration,
      }));

      const distanceInMiles = feature.properties.segments[0].distance / 1609.34;

      const totalSeconds = feature.properties.segments[0].duration;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      const formattedDuration =
        hours > 0 ? `${hours} hour ${minutes} min` : `${minutes} min`;

      res.status(HttpStatusCode.OK).json({
        status: Status.SUCCESS,
        message: 'Route fetched successfully',
        data: {
          polyline,
          navigation,
          distance: `${distanceInMiles.toFixed(2)} mile`,
          duration: formattedDuration,
        },
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
