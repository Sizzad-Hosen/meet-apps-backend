import express from "express";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { LiveKitControllers } from "./livekit.controller";
import { LiveKitValidation } from "./livekit.validation";

const router = express.Router();

router.post("/webhook", express.raw({ type: 'application/json' }), LiveKitControllers.handleWebhook);
router.post("/token", express.json(), auth(), validateRequest(LiveKitValidation.tokenSchema), LiveKitControllers.issueToken);

export const LiveKitRoutes = router;
