import mongoose, { Schema, type InferSchemaType } from "mongoose";

const MessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Conversation" },
    senderId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    text: { type: String, required: true },
    readAt: { type: Date },
  },
  { timestamps: true, collection: "messages" },
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof MessageSchema> & { _id: mongoose.Types.ObjectId };

export const MessageModel =
  (mongoose.models.Message as mongoose.Model<MessageDoc>) ||
  mongoose.model<MessageDoc>("Message", MessageSchema);
