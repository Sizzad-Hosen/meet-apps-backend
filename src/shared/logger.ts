import winston from "winston";
import config from "../app/config";

const logLevel = config.env === "production" ? "info" : "debug";

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "meet-app-backend" },
  transports: [
    new winston.transports.Console(),
  ],
});
