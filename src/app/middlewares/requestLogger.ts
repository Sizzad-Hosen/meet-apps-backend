import { NextFunction, Request, Response } from "express";
import { logger } from "../../shared/logger";

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info("http_request", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.userId ?? null,
      ip: req.ip,
    });
  });

  next();
};
