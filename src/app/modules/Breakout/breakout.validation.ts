import z from "zod";

const meetingCodeSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
    }),
});

const createBreakoutSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
    }),
    body: z.object({
        rooms: z.array(z.object({
            name: z.string().trim().min(1).max(100).optional(),
            participantIds: z.array(z.string().uuid()).optional(),
        })).optional(),
    }).optional(),
});

const joinBreakoutSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
        roomId: z.string().uuid(),
    }),
});

const broadcastBreakoutSchema = z.object({
    params: z.object({
        code: z.string().trim().min(4).max(12),
    }),
    body: z.object({
        message: z.string().trim().min(1),
    }),
});

export const BreakoutValidation = {
    meetingCodeSchema,
    createBreakoutSchema,
    joinBreakoutSchema,
    broadcastBreakoutSchema,
};
