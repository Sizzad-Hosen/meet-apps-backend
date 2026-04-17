import express from "express";
import { auth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { PollControllers } from "./polls.controller";
import { PollsValidation } from "./polls.validation";

const router = express.Router({ mergeParams: true });

router.post("/", auth(), validateRequest(PollsValidation.createPollSchema), PollControllers.createPoll);
router.get("/", auth(), validateRequest(PollsValidation.meetingCodeSchema), PollControllers.listPolls);
router.post("/:pollId/vote", auth(), validateRequest(PollsValidation.submitVoteSchema), PollControllers.submitPollVote);
router.get("/:pollId/results", auth(), validateRequest(PollsValidation.pollIdSchema), PollControllers.getPollResults);
router.post("/:pollId/close", auth(), validateRequest(PollsValidation.pollIdSchema), PollControllers.closePoll);

export const PollRoutes = router;
