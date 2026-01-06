import bcrypt from "bcrypt";
import type mongoose from "mongoose";
import { env } from "../configurations/env.js";
import { UserRole, UserStatus } from "../common/enums.js";

export const name = "002_seed_admin_user";

export async function up(conn: mongoose.Connection) {
  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  const existing = await conn.collection("users").findOne({ email });

  if (existing) return;

  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);

  await conn.collection("users").insertOne({
    fullName: env.SEED_ADMIN_NAME,
    email,
    passwordHash,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function down(conn: mongoose.Connection) {
  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  await conn.collection("users").deleteOne({ email, role: UserRole.ADMIN });
}
