import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import { MeetingServices } from "./meetings.service.v2";

const requireUserId = (req: Request) => req.user?.userId || "";

const createMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.createMeetings(req.body, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Meeting created successfully",
    data: result,
  });
});

const joinMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.joinMeeting(req.body.joinCode, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting joined successfully",
    data: result,
  });
});

const leaveMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.leaveMeeting(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting left successfully",
    data: result,
  });
});

const getWaitingRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.getWaitingRoom(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Waiting room fetched",
    data: result,
  });
});

const admitParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.admitParticipant(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participant admitted successfully",
    data: result,
  });
});

const admitAll = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.admitAll(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All participants admitted successfully",
    data: result,
  });
});

const createBreakoutRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.createBreakoutRooms(req.params.code, req.body, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Breakout rooms created successfully',
    data: result,
  });
});

const listBreakoutRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.listBreakoutRooms(req.params.code, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Breakout rooms fetched successfully',
    data: result,
  });
});

const joinBreakoutRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.joinBreakoutRoom(req.params.code, req.params.roomId, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Joined breakout room successfully',
    data: result,
  });
});

const endAllBreakoutRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.endAllBreakoutRooms(req.params.code, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'All breakout rooms closed successfully',
    data: result,
  });
});

const broadcastBreakoutMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.broadcastBreakoutMessage(req.params.code, req.body, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Broadcast message sent to breakout rooms',
    data: result,
  });
});

const createPoll = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.createPoll(req.params.code, req.body, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Poll created successfully',
    data: result,
  });
});

const listPolls = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.listPolls(req.params.code);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Polls fetched successfully',
    data: result,
  });
});

const submitPollVote = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.submitPollVote(req.params.code, req.params.pollId, req.body, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Vote submitted successfully',
    data: result,
  });
});

const getPollResults = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.getPollResults(req.params.code, req.params.pollId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Poll results fetched successfully',
    data: result,
  });
});

const closePoll = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.closePoll(req.params.code, req.params.pollId, requireUserId(req));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Poll closed successfully',
    data: result,
  });
});

const denyParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.denyParticipant(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participant denied successfully",
    data: result,
  });
});

const kickParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.kickParticipant(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participant kicked successfully",
    data: result,
  });
});

const endMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.endMeeting(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting ended successfully",
    data: result,
  });
});

const muteParticipant = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.muteParticipant(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participant muted successfully",
    data: result,
  });
});

const muteAll = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.muteAll(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All participants muted successfully",
    data: result,
  });
});

const getParticipants = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.getParticipants(req.params.code);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Participants fetched successfully",
    data: result,
  });
});

const assignCohost = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.assignCohost(req.params.code, req.params.userId, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Co-host assigned successfully",
    data: result,
  });
});

const getMeetingByCode = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.getMeetingByCode(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting fetched successfully",
    data: result,
  });
});

const updateMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.updateMeeting(req.params.code, req.body, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting updated successfully",
    data: result,
  });
});

const deleteMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.deleteMeeting(req.params.code, requireUserId(req));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Meeting deleted successfully",
    data: result,
  });
});

export const MeetingsControllers = {
  createMeeting,
  joinMeeting,
  leaveMeeting,
  getMeetingByCode,
  updateMeeting,
  deleteMeeting,
  admitParticipant,
  admitAll,
  denyParticipant,
  kickParticipant,
  endMeeting,
  createBreakoutRooms,
  listBreakoutRooms,
  joinBreakoutRoom,
  endAllBreakoutRooms,
  broadcastBreakoutMessage,
  createPoll,
  listPolls,
  submitPollVote,
  getPollResults,
  closePoll,
  getWaitingRoom,
  muteParticipant,
  muteAll,
  getParticipants,
  assignCohost,
};
