import { Request, Response } from 'express';

interface ApiMeta {
  requestId: string;
  timestamp: string;
}

function getMeta(req: Request): ApiMeta {
  return {
    requestId: (req.headers['x-request-id'] as string) || '',
    timestamp: new Date().toISOString(),
  };
}

export function sendSuccess(res: Response, req: Request, data: unknown, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    error: null,
    meta: getMeta(req),
  });
}

export function sendError(
  res: Response,
  req: Request,
  errorCode: string,
  statusCode: number,
): void {
  res.status(statusCode).json({
    success: false,
    data: null,
    error: errorCode,
    meta: getMeta(req),
  });
}
