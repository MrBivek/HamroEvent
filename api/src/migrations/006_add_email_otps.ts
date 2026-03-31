import type mongoose from "mongoose";

export const name = "006_add_email_otps";

function defaultIndexName(keys: Record<string, unknown>) {
    return Object.entries(keys)
        .map(([field, value]) => `${field}_${value}`)
        .join("_");
}

async function createIndexSafe(
    conn: mongoose.Connection,
    collection: string,
    index: Record<string, unknown>,
    options?: { name?: string } & Record<string, unknown>,
) {
    const coll = conn.collection(collection);
    try {
        await coll.createIndex(index as any, options as any);
    } catch (err: any) {
        const code = err?.code;
        if (code !== 85 && code !== 86) throw err;

        const name = options?.name ?? defaultIndexName(index);
        try {
            await coll.dropIndex(name);
        } catch {
            // ignore drop failures
        }
        await coll.createIndex(index as any, options as any);
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
