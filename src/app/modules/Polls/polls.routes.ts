import express from "express";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { PollControllers } from "./polls.controller";
import { PollsValidation } from "./polls.validation";

const router = express.Router({ mergeParams: true });

router.post("/", validateRequest(PollsValidation.createPollSchema), auth(), PollControllers.createPoll);
router.get("/", validateRequest(PollsValidation.meetingCodeSchema), auth(), PollControllers.listPolls);
router.post("/:pollId/vote", validateRequest(PollsValidation.submitVoteSchema), auth(), PollControllers.submitPollVote);
router.get("/:pollId/results", validateRequest(PollsValidation.pollIdSchema), auth(), PollControllers.getPollResults);
router.post("/:pollId/close", validateRequest(PollsValidation.pollIdSchema), auth(), PollControllers.closePoll);

export const PollRoutes = router;
