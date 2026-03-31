import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import mongoose from "mongoose";
import { NotificationModel } from "./notification.model.js";
import { NotificationListQuerySchema } from "./notifications.schemas.js";
import { NotFoundError } from "../../common/errors.js";
import { mapNotificationTypeToUi } from "../../common/mappers.js";

function mapNotification(doc: any) {
    return {
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        type: mapNotificationTypeToUi(doc.type),
        title: doc.title,
        body: doc.body,
        link: doc.link,
        isRead: Boolean(doc.readAt),
        createdAt: doc.createdAt?.toISOString(),
    };
}

export const notificationsRoutes = Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List my notifications
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: unread
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
notificationsRoutes.get("/", requireAuth, async (req, res, next) => {
    try {
        const q = NotificationListQuerySchema.parse(req.query);
        const skip = (q.page - 1) * q.limit;

        const filter: Record<string, unknown> = { userId: req.auth!.sub };
        if (String(q.unread ?? "false") === "true") {
            filter.readAt = { $exists: false };
        }

        const [items, total] = await Promise.all([
            NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
            NotificationModel.countDocuments(filter),
        ]);

        res.json({ items: items.map(mapNotification), page: q.page, limit: q.limit, total });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
notificationsRoutes.post("/:id/read", requireAuth, async (req, res, next) => {
    try {
        const id = String(req.params.id);
        if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Notification not found");
        const doc = await NotificationModel.findOneAndUpdate(
            { _id: id, userId: req.auth!.sub },
            { $set: { readAt: new Date() } },
            { new: true },
        ).lean();

        if (!doc) throw new NotFoundError("Notification not found");

        res.json(mapNotification(doc));
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/notifications/read-all:
 *   post:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
notificationsRoutes.post("/read-all", requireAuth, async (req, res, next) => {
    try {
        const result = await NotificationModel.updateMany(
            { userId: req.auth!.sub, readAt: { $exists: false } },
            { $set: { readAt: new Date() } },
        );
        res.json({ updated: result.modifiedCount });
    } catch (err) {
        next(err);
    }
});
