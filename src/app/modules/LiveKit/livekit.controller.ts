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
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: "Authorization header is required",
    });
  }

  const rawBody = req.body;
  if (!rawBody) {
    return sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: "Webhook body is required",
    });
  }

  const bodyAsString = Buffer.isBuffer(rawBody)
    ? rawBody.toString("utf8")
    : typeof rawBody === "string"
      ? rawBody
      : JSON.stringify(rawBody);

  const event = await clientes.webhookReceiver.receive(bodyAsString, authHeader);
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
