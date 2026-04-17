import { z } from "zod";

const tokenSchema = z.object({
  body: z.object({
    joinCode: z.string().trim().min(4).max(12),
  }),
});

export const LiveKitValidation = {
  tokenSchema,
};
