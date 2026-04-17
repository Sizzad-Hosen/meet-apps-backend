import app from "./app";
import { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import config from "./app/config";
import { logger } from "./shared/logger";
import { registerSocketServer } from "./app/sockets";
import prisma from "./lib/prisma";

let httpServer: Server | undefined;
let io: SocketIOServer | undefined;

async function gracefulShutdown(signal: string, exitCode: number): Promise<void> {
  logger.info("shutdown_start", { signal });
  const force = setTimeout(() => {
    logger.error("shutdown_timeout_forcing_exit");
    process.exit(1);
  }, config.shutdown_timeout_ms);

  try {
    if (io) {
      await new Promise<void>((resolve, reject) => {
        io!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    await prisma.$disconnect();
    clearTimeout(force);
    logger.info("shutdown_complete", { signal });
    process.exit(exitCode);
  } catch (error) {
    logger.error("shutdown_error", { error });
    clearTimeout(force);
    process.exit(1);
  }
}

async function main() {
  httpServer = app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port}`);
  });

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors_origins.length ? config.cors_origins : true,
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 120000,
    },
  });
  registerSocketServer(io);

  process.on("SIGTERM", () => {
    void gracefulShutdown("SIGTERM", 0);
  });
  process.on("SIGINT", () => {
    void gracefulShutdown("SIGINT", 0);
  });

  process.on("uncaughtException", (error) => {
    logger.error("uncaught_exception", { error });
    process.exit(1);
  });

  process.on("unhandledRejection", (error) => {
    logger.error("unhandled_rejection", { error });
    void gracefulShutdown("unhandledRejection", 1);
  });
}

void main();
