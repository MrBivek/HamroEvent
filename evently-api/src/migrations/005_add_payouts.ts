import type mongoose from "mongoose";

export const name = "005_add_payouts";

export async function up(conn: mongoose.Connection) {
  await conn.collection("payouts").createIndex({ vendorId: 1, createdAt: -1 }).catch(() => {});
  await conn.collection("payouts").createIndex({ status: 1 }).catch(() => {});
}

export async function down(conn: mongoose.Connection) {
  await conn.collection("payouts").dropIndex("vendorId_1_createdAt_-1").catch(() => {});
  await conn.collection("payouts").dropIndex("status_1").catch(() => {});
}
