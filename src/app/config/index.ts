import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  EXPIRE_IN: z.string().default("1d"),
  REFRESH_TOKEN_SECRET: z.string().min(8, "REFRESH_TOKEN_SECRET must be at least 8 characters"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  RESET_PASS_TOKEN: z.string().default("reset-secret"),
  RESET_PASS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  RESET_PASS_URL: z.string().url().default("http://localhost:3000/reset-password"),
  EMAIL: z.string().email().optional(),
  APP_PASS: z.string().optional(),
  SALT_ROUND: z.coerce.number().int().min(8).max(15).default(10),
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

const env = parsed.data;

export default {
  env: env.NODE_ENV,
  port: env.PORT,
  jwt: {
    jwt_secret: env.JWT_SECRET,
    expires_in: env.EXPIRE_IN,
    refresh_token_secret: env.REFRESH_TOKEN_SECRET,
    refresh_token_expires_in: env.REFRESH_TOKEN_EXPIRES_IN,
    reset_pass_secret: env.RESET_PASS_TOKEN,
    reset_pass_token_expires_in: env.RESET_PASS_TOKEN_EXPIRES_IN,
  },
  reset_pass_link: env.RESET_PASS_URL,
  email: env.EMAIL,
  app_pass: env.APP_PASS,
  salt_round: env.SALT_ROUND,
  cors_origins: env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [],
  rate_limit_window_ms: env.RATE_LIMIT_WINDOW_MS,
  rate_limit_max_requests: env.RATE_LIMIT_MAX_REQUESTS,
};