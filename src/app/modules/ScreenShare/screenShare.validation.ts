import z from "zod";

const codeParamSchema = z.object({
  code: z.string().trim().min(4).max(12),
});

const userParamSchema = z.object({
  code: z.string().trim().min(4).max(12),
  userId: z.string().uuid(),
});

const codeOnlySchema = z.object({
  params: codeParamSchema,
});

const userActionSchema = z.object({
  params: userParamSchema,
});

export const ScreenShareValidation = {
  codeOnlySchema,
  userActionSchema,
};
