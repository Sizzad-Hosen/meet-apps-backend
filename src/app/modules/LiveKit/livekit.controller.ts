import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../shared/catchAsync";
import { clientes } from "../../../helpers/s3";
import { sendResponse } from "../../../shared/sendResponse";
import { MeetingServices } from "../Meetings/meetings.service.v2";

const issueToken = catchAsync(async (req: Request, res: Response) => {
  if (!req.body.joinCode) {
    return sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: "joinCode is required",
    });
  }

  const userId = req.user?.userId;
  if (!userId) {
    return sendResponse(res, {
      statusCode: StatusCodes.UNAUTHORIZED,
      success: false,
      message: "Authentication required",
    });
  }

  const result = await MeetingServices.getLiveKitToken(req.body.joinCode, userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "LiveKit token issued successfully",
    data: result,
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const authHeader = req.header("Authorization");
  const event = await clientes.webhookReceiver.receive(rawBody.toString("utf8"), authHeader);
  const result = await MeetingServices.handleWebhookEvent(event);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Webhook processed successfully",
    data: result,
  });
});

export const LiveKitControllers = {
  issueToken,
  handleWebhook,
};
