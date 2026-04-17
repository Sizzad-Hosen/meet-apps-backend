import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { AuthRoutes } from "./app/modules/Auth/auth.routes";
import { MeetingsRoutes } from "./app/modules/Meetings/meetings.routes";
import { ScreenShareRoutes } from "./app/modules/ScreenShare/screenShare.route";
import { RecordingRoutes } from "./app/modules/Record/record.routes";
import { LiveKitRoutes } from "./app/modules/LiveKit/livekit.routes";
import config from "./app/config";
import { apiRateLimiter } from "./app/middlewares/rateLimit";
import { requestLogger } from "./app/middlewares/requestLogger";
import prisma from "./lib/prisma";

const app = express();

if (config.trust_proxy > 0) {
  app.set("trust proxy", config.trust_proxy);
}

// middlewares
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.cors_origins.length ? config.cors_origins : true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: config.json_body_limit }));
app.use(express.urlencoded({ extended: true, limit: config.json_body_limit }));
app.use(apiRateLimiter);
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Service is healthy",
    data: {
      status: "ok",
      uptime: process.uptime(),
    },
  });
});

/** Liveness: process is up (use for load balancer / orchestrator probes) */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

/** Readiness: can serve traffic (database reachable) */
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});

// api routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/meetings", MeetingsRoutes);
app.use("/api/v1/screen-share", ScreenShareRoutes);
app.use("/api/v1/recordings", RecordingRoutes);
app.use("/api/v1/livekit", LiveKitRoutes);

// Global Error Handler and Not FOund Middleware
app.use("*", require("./app/middlewares/notFound").notFound);
app.use(require("./app/middlewares/globalErrorHandler").globalErrorHandler);
export default app;
