import type mongoose from "mongoose";

export const name = "004_add_quote_and_conversation_indexes";

export async function up(conn: mongoose.Connection) {
  await conn
    .collection("quotes")
    .createIndex({ bookingId: 1 }, { unique: true })
    .catch(() => {});

  await conn
    .collection("conversations")
    .createIndex({ bookingId: 1 }, { unique: true, sparse: true })
    .catch(() => {});
}

export async function down(conn: mongoose.Connection) {
  await conn.collection("quotes").dropIndex("bookingId_1").catch(() => {});
  await conn.collection("conversations").dropIndex("bookingId_1").catch(() => {});
}
