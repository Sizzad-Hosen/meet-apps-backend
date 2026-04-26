import z from "zod";

const registerUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(6).max(100),
  }),
});

const loginUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const sendVerificationEmailSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    newPassword: z.string().min(6).max(100),
  }),
});

export const AuthValidation = {
  registerUserSchema,
  loginUserSchema,
  forgotPasswordSchema,
  sendVerificationEmailSchema,
  verifyEmailSchema,
  resetPasswordSchema,
};
