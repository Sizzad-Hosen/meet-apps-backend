import z from 'zod';

const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().trim().min(2).max(100).optional(),
        avatarUrl: z.string().url().optional(),
        settings: z.any().optional(),
    }).refine((payload) => Object.keys(payload).length > 0, {
        message: 'At least one update field is required',
    }),
});

const uploadAvatarSchema = z.object({
    body: z.object({
        avatarBase64: z.string().optional(),
        avatarUrl: z.string().url().optional(),
    }).refine((payload) => payload.avatarBase64 || payload.avatarUrl, {
        message: 'avatarBase64 or avatarUrl is required',
    }),
});

export const UsersValidation = {
    updateProfileSchema,
    uploadAvatarSchema,
};
