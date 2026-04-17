import rateLimit from "express-rate-limit";
import config from "../config";

export const apiRateLimiter = rateLimit({
  windowMs: config.rate_limit_window_ms,
  limit: config.rate_limit_max_requests,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
