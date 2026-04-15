// utils/sendResponse.ts
import { Response } from "express";

interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export const sendResponse = <T>(res: Response, data: IApiResponse<T>): void => {
  const responseData = {
    success: data.success,
    message: data.message || "",
    ...(data.data !== undefined ? { data: data.data } : {}),
    ...(data.meta ? { meta: data.meta } : {}),
  };

  res.status(data.statusCode).json(responseData);
};
