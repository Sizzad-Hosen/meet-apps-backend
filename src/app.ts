import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { AuthRoutes } from "./app/modules/Auth/auth.routes";
import { MeetingsRoutes } from "./app/modules/Meetings/meetings.routes";
import { ScreenShareRoutes } from "./app/modules/ScreenShare/screenShare.route";
import { RecordingRoutes } from "./app/modules/Record/record.routes";
import { LiveKitRoutes } from "./app/modules/LiveKit/livekit.routes";
import { UsersRoutes } from "./app/modules/Users/users.routes";
const app = express();

// middlewares
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(cookieParser());
app.use("/api/v1/livekit", LiveKitRoutes);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    console.log("Hello World");
    res.send("Hello World");
})

// api routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/meetings", MeetingsRoutes);
app.use("/api/v1/users", UsersRoutes);
app.use("/api/v1/screen-share", ScreenShareRoutes)
app.use('/recordings', express.static('recordings'));
app.use("/api/v1/recordings", RecordingRoutes);

// Global Error Handler and Not FOund Middleware
app.use("*", require("./app/middlewares/notFound").notFound);
app.use(require("./app/middlewares/globalErrorHandler").globalErrorHandler);
export default app;
