import { z } from "zod";

const codeParamSchema = z.object({
  code: z.string().trim().min(4).max(12),
});

const recordingIdParamSchema = z.object({
  recordingId: z.string().uuid(),
});

const meetingIdParamSchema = z.object({
  meetingId: z.string().uuid(),
});

const codeOnlySchema = z.object({
  params: codeParamSchema,
});

const recordingIdSchema = z.object({
  params: recordingIdParamSchema,
});

const meetingIdSchema = z.object({
  params: meetingIdParamSchema,
});

export const RecordValidation = {
  codeOnlySchema,
  recordingIdSchema,
  meetingIdSchema,
};
