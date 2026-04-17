import z from "zod";

const codeParamSchema = z.object({
  code: z.string().trim().min(4).max(12),
});

const userIdParamSchema = z.object({
  code: z.string().trim().min(4).max(12),
  userId: z.string().uuid(),
});

const createMeetingSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(255),
    type: z.enum(["instant", "scheduled"]).default("instant"),
    max_participants: z.number().int().min(2).max(500).optional(),
    waiting_room_on: z.boolean().optional(),
    allow_screenshare: z.boolean().optional(),
    screenshare_needs_approval: z.boolean().optional(),
    is_recorded: z.boolean().optional(),
    scheduled_at: z.string().datetime().optional(),
  }),
});

const joinMeetingSchema = z.object({
  body: z.object({
    joinCode: z.string().trim().min(4).max(12),
  }),
});

const meetingCodeSchema = z.object({
  params: codeParamSchema,
});

const participantActionSchema = z.object({
  params: userIdParamSchema,
});

const createBreakoutSchema = z.object({
  params: codeParamSchema,
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
  params: codeParamSchema,
  body: z.object({
    message: z.string().trim().min(1),
  }),
});

const createPollSchema = z.object({
  params: codeParamSchema,
  body: z.object({
    question: z.string().trim().min(2).max(255),
    options: z.array(z.string().trim().min(1).max(255)).min(2),
  }),
});

const pollIdSchema = z.object({
  params: z.object({
    code: z.string().trim().min(4).max(12),
    pollId: z.string().uuid(),
  }),
});

const votePollSchema = z.object({
  params: z.object({
    code: z.string().trim().min(4).max(12),
    pollId: z.string().uuid(),
  }),
  body: z.object({
    optionId: z.string().uuid(),
  }),
});

const closePollSchema = z.object({
  params: z.object({
    code: z.string().trim().min(4).max(12),
    pollId: z.string().uuid(),
  }),
});

const updateMeetingSchema = z.object({
  params: codeParamSchema,
  body: z.object({
    title: z.string().trim().min(2).max(255).optional(),
    waiting_room_on: z.boolean().optional(),
    max_participants: z.number().int().min(2).max(500).optional(),
    allow_screenshare: z.boolean().optional(),
    screenshare_needs_approval: z.boolean().optional(),
    is_recorded: z.boolean().optional(),
    scheduled_at: z.string().datetime().nullable().optional(),
  }).refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  }),
});

export const MeetingsValidation = {
  createMeetingSchema,
  joinMeetingSchema,
  meetingCodeSchema,
  participantActionSchema,
  updateMeetingSchema,
  createBreakoutSchema,
  joinBreakoutSchema,
  broadcastBreakoutSchema,
  createPollSchema,
  pollIdSchema,
  votePollSchema,
  closePollSchema,
};
