import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  EXPIRE_IN: z.string().default("1d"),
  REFRESH_TOKEN_SECRET: z.string().min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  RESET_PASS_TOKEN: z.string().min(1, "RESET_PASS_TOKEN is required"),
  RESET_PASS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  RESET_PASS_URL: z.string().url().default("http://localhost:3000/reset-password"),
  EMAIL: z.string().email().optional(),
  APP_PASS: z.string().optional(),
  SALT_ROUND: z.coerce.number().int().min(8).max(15).default(10),
  CORS_ORIGINS: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  /** Number of reverse proxies (e.g. load balancer) in front of the app; 0 = disabled */
  TRUST_PROXY: z.coerce.number().int().min(0).max(32).default(0),
  /** Express JSON/urlencoded body size cap (e.g. 100kb, 1mb) */
  JSON_BODY_LIMIT: z.string().default("100kb"),
  /** Max connections in the shared pg Pool used by Prisma */
  PG_POOL_MAX: z.coerce.number().int().positive().max(200).default(10),
  /** Max time to wait for HTTP + Socket.IO close + Prisma disconnect before force exit */
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
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
  trust_proxy: env.TRUST_PROXY,
  json_body_limit: env.JSON_BODY_LIMIT,
  pg_pool_max: env.PG_POOL_MAX,
  shutdown_timeout_ms: env.SHUTDOWN_TIMEOUT_MS,
};