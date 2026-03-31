import type mongoose from "mongoose";

export const name = "007_add_vendor_payment_configs";

export async function up(conn: mongoose.Connection) {
    await conn.createCollection("vendorPaymentConfigs").catch(() => {});
    await conn.collection("vendorPaymentConfigs").createIndex({ vendorId: 1 }, { unique: true });
}

export async function down(conn: mongoose.Connection) {
    await conn
        .collection("vendorPaymentConfigs")
        .drop()
        .catch(() => {});
}
