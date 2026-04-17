import z from "zod";

const meetingCodeSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
    }),
});

const pollIdSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
        pollId: z.string().uuid(),
    }),
});

const createPollSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
    }),
    body: z.object({
        question: z.string().trim().min(1).max(255),
        options: z.array(z.string().trim().min(1).max(255)).min(2).max(20),
    }),
});

const submitVoteSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
        pollId: z.string().uuid(),
    }),
    body: z.object({
        optionId: z.string().uuid(),
    }),
});

export const PollsValidation = {
    meetingCodeSchema,
    pollIdSchema,
    createPollSchema,
    submitVoteSchema,
};
