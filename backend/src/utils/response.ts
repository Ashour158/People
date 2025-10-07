import { Response } from 'express';
import { PaginationMeta } from '../types';

export const successResponse = (
  res: Response,
  data: any,
  message?: string,
  meta?: PaginationMeta,
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    meta
  });
};

export const errorResponse = (
  res: Response,
  error: string,
  statusCode: number = 400
): Response => {
  return res.status(statusCode).json({
    success: false,
    error
  });
};
