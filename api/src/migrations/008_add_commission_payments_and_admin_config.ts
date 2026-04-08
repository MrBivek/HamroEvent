import type mongoose from "mongoose";

export const name = "008_add_commission_payments_and_admin_config";

export async function up(conn: mongoose.Connection) {
    const db = conn.db;
    if (!db) throw new Error("Database connection is not ready");

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const existing = new Set(collections.map((collection) => collection.name));

    if (!existing.has("commissionPayments")) {
        await db.createCollection("commissionPayments");
    }

    if (!existing.has("adminPaymentConfigs")) {
        await db.createCollection("adminPaymentConfigs");
    }

    await db.collection("commissionPayments").createIndex({ vendorId: 1, monthKey: 1, status: 1 });
    await db
        .collection("commissionPayments")
        .createIndex({ providerRef: 1 }, { unique: true, sparse: true });
    await db.collection("adminPaymentConfigs").createIndex({ key: 1 }, { unique: true });
}

export async function down(conn: mongoose.Connection) {
    const db = conn.db;
    if (!db) throw new Error("Database connection is not ready");

    await db
        .collection("commissionPayments")
        .drop()
        .catch(() => undefined);
    await db
        .collection("adminPaymentConfigs")
        .drop()
        .catch(() => undefined);
}
