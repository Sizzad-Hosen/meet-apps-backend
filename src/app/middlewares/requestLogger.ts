import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { logger } from "../../shared/logger";

const anonymizeIp = (ip: string | undefined): string | null => {
  if (!ip) {
    return null;
  }
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info("http_request", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.userId ?? null,
      ipHash: anonymizeIp(req.ip),
    });
  });

  next();
};
