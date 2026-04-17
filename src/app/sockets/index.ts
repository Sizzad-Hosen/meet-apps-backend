import { Server, Socket } from "socket.io";
import { verifyToken } from "../../helpers/jwtHelpers";
import config from "../config";
import { logger } from "../../shared/logger";

interface SocketAuthPayload {
  userId: string;
  role: string;
  email: string;
}

const getToken = (socket: Socket): string | undefined => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }

  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.split(" ")[1];
  }

  return undefined;
};

export const registerSocketServer = (io: Server): void => {
  io.use(async (socket, next) => {
    try {
      const token = getToken(socket);
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = await verifyToken(token, config.jwt.jwt_secret) as SocketAuthPayload;
      socket.data.user = payload;
      return next();
    } catch (error) {
      logger.warn("socket_auth_failed", {
        socketId: socket.id,
        error: error instanceof Error ? error.message : "unknown_error",
      });
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    logger.info("socket_connected", {
      socketId: socket.id,
      userId: socket.data.user?.userId ?? null,
    });

    socket.on("meeting:join", (meetingCode: string, ack?: (response: unknown) => void) => {
      const room = `meeting:${meetingCode}`;
      socket.join(room);
      ack?.({ success: true, room });
    });

    socket.on("breakout:join", (roomId: string, ack?: (response: unknown) => void) => {
      const room = `breakout:${roomId}`;
      socket.join(room);
      ack?.({ success: true, room });
    });

    socket.on("disconnect", (reason) => {
      logger.info("socket_disconnected", {
        socketId: socket.id,
        reason,
      });
    });
  });
};
