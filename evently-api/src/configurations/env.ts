import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGO_URI: z.string().min(1),

  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default("7d"),

  SEED_ADMIN_EMAIL: z.string().email().default("admin@event.local"),
  SEED_ADMIN_PASSWORD: z.string().min(6).default("affinityismyidol"),
  SEED_ADMIN_NAME: z.string().min(2).default("root Admin"),
  MIGRATE_ON_START: z
    .preprocess((val) => {
      if (typeof val !== "string") return val;
      const normalized = val.toLowerCase();
      if (["true", "1", "yes", "y"].includes(normalized)) return true;
      if (["false", "0", "no", "n"].includes(normalized)) return false;
      return val;
    }, z.boolean().default(false))
    .default(false),
});

export const env = EnvSchema.parse(process.env);
