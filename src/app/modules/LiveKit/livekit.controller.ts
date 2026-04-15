import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../../shared/catchAsync";
import { clientes } from "../../../helpers/s3";
import { sendResponse } from "../../../shared/sendResponse";
import { MeetingServices } from "../Meetings/meetings.service.v2";

const issueToken = catchAsync(async (req: Request, res: Response) => {
  const result = await MeetingServices.getLiveKitToken(req.body.joinCode, req.user?.userId || "");

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "LiveKit token issued successfully",
    data: result,
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const authHeader = req.header("Authorization") || req.header("Authorize") || undefined;
  const event = await clientes.webhookReceiver.receive(rawBody, authHeader);
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
