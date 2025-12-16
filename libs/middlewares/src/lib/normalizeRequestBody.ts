import { NextFunction, Request, Response } from 'express';

export function normalizeRequestBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.body.data) {
    try {
      req.body = JSON.parse(req.body.data);
    } catch {
      res.status(400).json({ error: 'Invalid JSON in data field' });
      return;
    }
  }

  if (req.body && typeof req.body === 'object') {
    req.body = JSON.parse(JSON.stringify(req.body));
  }

  next();
}
