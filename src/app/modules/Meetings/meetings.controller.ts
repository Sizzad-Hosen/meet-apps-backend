import { Request, Response } from "express";
import { catchAsync } from "../../../shared/catchAsync";
import { sendResponse } from "../../../shared/sendResponse";
import { MeetingServices } from "./meetings.service";
import { StatusCodes } from "http-status-codes";


const createMeeting = catchAsync(async (req: Request, res: Response) => {

    const user = req.user;

    console.log('Authenticated user:', user);

    if (!req.user) {
      return sendResponse(res, {
        statusCode: StatusCodes.UNAUTHORIZED,
        success: false,
        message: 'User not authenticated',
        data: null,
      });
    }

    const result = await MeetingServices.createMeetings(req.body, req.user.userId);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success:    true,
    message:    'Meeting created successfully',
    data: {
      meeting: result
    }
    },
  );
});


export const MeetingsControllers = {
    createMeeting
}