import type mongoose from "mongoose";

export const name = "006_add_email_otps";

async function createIndexSafe(
  conn: mongoose.Connection,
  collection: string,
  index: Record<string, 1 | -1>,
  options?: mongoose.IndexOptions,
) {
  try {
    await conn.collection(collection).createIndex(index, options);
  } catch (err: any) {
    const code = err?.code;
    if (code === 85 || code === 86) {
      const name = options?.name;
      if (name) {
        await conn
          .collection(collection)
          .dropIndex(name)
          .catch(() => {});
      }
      await conn.collection(collection).createIndex(index, options);
      return;
    }
    throw err;
  }
}

export async function up(conn: mongoose.Connection) {
  await conn.createCollection("emailOtps").catch(() => {});
  await createIndexSafe(conn, "emailOtps", { email: 1 }, { unique: true, name: "email_1" });
  await createIndexSafe(conn, "emailOtps", { userId: 1 }, { name: "userId_1" });
  await createIndexSafe(
    conn,
    "emailOtps",
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "expiresAt_1" },
  );
}

export async function down(conn: mongoose.Connection) {
  await conn
    .collection("emailOtps")
    .dropIndex("email_1")
    .catch(() => {});
  await conn
    .collection("emailOtps")
    .dropIndex("userId_1")
    .catch(() => {});
  await conn
    .collection("emailOtps")
    .dropIndex("expiresAt_1")
    .catch(() => {});
  await conn
    .collection("emailOtps")
    .drop()
    .catch(() => {});
}
