import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().min(1),

  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default("7d"),

  SEED_ADMIN_EMAIL: z.string().email().default("admin@evently.local"),
  SEED_ADMIN_PASSWORD: z.string().min(6).default("Admin@123456"),
  SEED_ADMIN_NAME: z.string().min(2).default("Evently Admin"),
});

export const env = EnvSchema.parse(process.env);
