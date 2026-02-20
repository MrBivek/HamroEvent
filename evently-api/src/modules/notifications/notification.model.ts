import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { NotificationType } from "../../common/enums.js";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    type: { type: String, enum: Object.values(NotificationType), required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: { type: String },
    readAt: { type: Date },
  },
  { timestamps: true, collection: "notifications" },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1 });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & { _id: mongoose.Types.ObjectId };

export const NotificationModel =
  (mongoose.models.Notification as mongoose.Model<NotificationDoc>) ||
  mongoose.model<NotificationDoc>("Notification", NotificationSchema);
