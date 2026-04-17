import app from './app';
import { Server } from 'http';
import { Server as SocketIOServer } from "socket.io";
import config from './app/config';
import { logger } from './shared/logger';
import { registerSocketServer } from './app/sockets';

async function main(){

    const server:Server = app.listen(config.port,()=>{
        logger.info(`Server is running on port ${config.port}`);
    });
    const io = new SocketIOServer(server, {
        cors: {
            origin: config.cors_origins.length ? config.cors_origins : true,
            credentials: true,
        },
        connectionStateRecovery: {
            maxDisconnectionDuration: 120000,
        },
    });
    registerSocketServer(io);

   const exitHandler = () => {
        if (server) {
            server.close(() => {
                logger.info("Server closed!");
            });
        }
        process.exit(1);
    };
    process.on('uncaughtException', (error) => {
        logger.error("uncaught_exception", { error });
        exitHandler();
    });

    process.on('unhandledRejection', (error) => {
        logger.error("unhandled_rejection", { error });
        exitHandler();
    });

}

main();
