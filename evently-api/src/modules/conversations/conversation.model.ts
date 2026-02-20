import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ConversationSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, required: true, ref: "User" }],
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", index: true },
    lastMessageAt: { type: Date },
  },
  { timestamps: true, collection: "conversations" },
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ bookingId: 1 }, { unique: true, sparse: true });

export type ConversationDoc = InferSchemaType<typeof ConversationSchema> & { _id: mongoose.Types.ObjectId };

export const ConversationModel =
  (mongoose.models.Conversation as mongoose.Model<ConversationDoc>) ||
  mongoose.model<ConversationDoc>("Conversation", ConversationSchema);
