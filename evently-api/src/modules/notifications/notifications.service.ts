import mongoose from "mongoose";
import { NotificationModel } from "./notification.model.js";
import { NotificationType, UserRole, UserStatus } from "../../common/enums.js";
import { UserModel } from "../auth/user.model.js";

export async function createNotification(input: {
    userId: string | mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
}) {
    const userId =
        typeof input.userId === "string" ? new mongoose.Types.ObjectId(input.userId) : input.userId;
    await NotificationModel.create({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
    });
}

export async function createNotificationsForAdmins(input: {
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
}) {
    const admins = await UserModel.find({ role: UserRole.ADMIN, status: UserStatus.ACTIVE })
        .select({ _id: 1 })
        .lean();
    if (!admins.length) return;
    await NotificationModel.insertMany(
        admins.map((admin) => ({
            userId: admin._id,
            type: input.type,
            title: input.title,
            body: input.body,
            link: input.link,
        })),
    );
}
