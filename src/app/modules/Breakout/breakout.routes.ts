import express from "express";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { BreakoutControllers } from "./breakout.controller";
import { BreakoutValidation } from "./breakout.validation";

const router = express.Router({ mergeParams: true });

router.post("/", validateRequest(BreakoutValidation.createBreakoutSchema), auth(), BreakoutControllers.createBreakoutRooms);
router.get("/", validateRequest(BreakoutValidation.meetingCodeSchema), auth(), BreakoutControllers.listBreakoutRooms);
router.post("/:roomId/join", validateRequest(BreakoutValidation.joinBreakoutSchema), auth(), BreakoutControllers.joinBreakoutRoom);
router.post("/end-all", validateRequest(BreakoutValidation.meetingCodeSchema), auth(), BreakoutControllers.endAllBreakoutRooms);
router.post("/broadcast", validateRequest(BreakoutValidation.broadcastBreakoutSchema), auth(), BreakoutControllers.broadcastBreakoutMessage);

export const BreakoutRoutes = router;
