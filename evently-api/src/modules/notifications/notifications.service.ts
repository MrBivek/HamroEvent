import mongoose from "mongoose";
import { NotificationModel } from "./notification.model.js";
import { NotificationType } from "../../common/enums.js";

export async function createNotification(input: {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  const userId = typeof input.userId === "string" ? new mongoose.Types.ObjectId(input.userId) : input.userId;
  await NotificationModel.create({
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });
}
