import type mongoose from "mongoose";

export const name = "007_update_email_otps_for_password_reset";

async function dropIndexIfExists(conn: mongoose.Connection, collection: string, indexName: string) {
    await conn
        .collection(collection)
        .dropIndex(indexName)
        .catch(() => {});
}

export async function up(conn: mongoose.Connection) {
    await conn.createCollection("emailOtps").catch(() => {});

    await dropIndexIfExists(conn, "emailOtps", "email_1");

    await conn
        .collection("emailOtps")
        .updateMany({ purpose: { $exists: false } }, { $set: { purpose: "VERIFY_ACCOUNT" } });

    await conn
        .collection("emailOtps")
        .createIndex({ email: 1, purpose: 1 }, { unique: true, name: "email_1_purpose_1" });
}

export async function down(conn: mongoose.Connection) {
    await dropIndexIfExists(conn, "emailOtps", "email_1_purpose_1");
    await conn.collection("emailOtps").createIndex({ email: 1 }, { unique: true, name: "email_1" });
}
