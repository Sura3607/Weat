import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message?: string,
  ) {
    super(message || errorCode);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.headers['x-request-id'] as string;

  if (err instanceof AppError) {
    logger.warn({
      requestId,
      errorCode: err.errorCode,
      message: err.message,
      statusCode: err.statusCode,
    });

    res.status(err.statusCode).json({
      success: false,
      data: null,
      error: err.errorCode,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Unexpected error
  logger.error({
    requestId,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    data: null,
    error: '500_INTERNAL_SERVER_ERROR',
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
