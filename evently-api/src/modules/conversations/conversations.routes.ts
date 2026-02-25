import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../common/errors.js";
import { ConversationModel } from "./conversation.model.js";
import { MessageModel } from "./message.model.js";
import {
    CreateConversationSchema,
    CreateMessageSchema,
    ConversationListQuerySchema,
    MessageListQuerySchema,
} from "./conversations.schemas.js";
import { BookingModel } from "../bookings/booking.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { createNotification } from "../notifications/notifications.service.js";
import { NotificationType } from "../../common/enums.js";
import { emitMessage } from "../../socket.js";

export const conversationsRoutes = Router();

function ensureObjectId(id: string, message: string) {
    if (!mongoose.isValidObjectId(id)) throw new NotFoundError(message);
    return new mongoose.Types.ObjectId(id);
}

async function assertParticipant(conversationId: mongoose.Types.ObjectId, userId: string) {
    const convo = await ConversationModel.findOne({
        _id: conversationId,
        participants: userId,
    }).lean();
    if (!convo) throw new ForbiddenError("You are not a participant in this conversation");
    return convo;
}

/**
 * @openapi
 * /api/conversations:
 *   post:
 *     tags: [Conversations]
 *     summary: Create or get a conversation
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId: { type: string }
 *               vendorId: { type: string }
 *               customerUserId: { type: string }
 *     responses:
 *       200: { description: OK }
 */
conversationsRoutes.post(
    "/",
    requireAuth,
    validateBody(CreateConversationSchema),
    async (req, res, next) => {
        try {
            const userId = req.auth!.sub;
            const { bookingId, vendorId, customerUserId } = req.body;

            if (bookingId) {
                const bookingObjectId = ensureObjectId(bookingId, "Booking not found");
                const booking = await BookingModel.findById(bookingObjectId).lean();
                if (!booking) throw new NotFoundError("Booking not found");

                const vendor = await VendorModel.findById(booking.vendorId).lean();
                if (!vendor) throw new NotFoundError("Vendor not found");

                const customerUserId = booking.userId.toString();
                const vendorUserId = vendor.userId.toString();

                if (userId !== customerUserId && userId !== vendorUserId) {
                    throw new ForbiddenError("Not authorized for this booking");
                }

                const existing = await ConversationModel.findOne({
                    bookingId: bookingObjectId,
                }).lean();
                if (existing) return res.json(existing);

                const convo = await ConversationModel.create({
                    participants: [customerUserId, vendorUserId],
                    bookingId: bookingObjectId,
                    vendorId: vendor._id,
                });

                return res.json(convo);
            }

            if (!vendorId)
                throw new BadRequestError("vendorId is required when bookingId is not provided");

            const vendorObjectId = ensureObjectId(vendorId, "Vendor not found");
            const vendor = await VendorModel.findById(vendorObjectId).lean();
            if (!vendor) throw new NotFoundError("Vendor not found");

            const vendorUserId = vendor.userId.toString();
            let customerId = userId;

            if (userId === vendorUserId) {
                if (!customerUserId)
                    throw new BadRequestError(
                        "customerUserId is required for vendor-initiated chats",
                    );
                ensureObjectId(customerUserId, "Customer not found");
                customerId = customerUserId;
            }

            const existing = await ConversationModel.findOne({
                vendorId: vendorObjectId,
                bookingId: { $exists: false },
                participants: { $all: [customerId, vendorUserId] },
            }).lean();

            if (existing) return res.json(existing);

            const convo = await ConversationModel.create({
                participants: [customerId, vendorUserId],
                vendorId: vendorObjectId,
            });

            res.json(convo);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/conversations:
 *   get:
 *     tags: [Conversations]
 *     summary: List my conversations
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
conversationsRoutes.get("/", requireAuth, async (req, res, next) => {
    try {
        const q = ConversationListQuerySchema.parse(req.query);
        const skip = (q.page - 1) * q.limit;

        const [items, total] = await Promise.all([
            ConversationModel.find({ participants: req.auth!.sub })
                .sort({ lastMessageAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(q.limit)
                .lean(),
            ConversationModel.countDocuments({ participants: req.auth!.sub }),
        ]);

        res.json({ items, page: q.page, limit: q.limit, total });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/conversations/{id}/messages:
 *   get:
 *     tags: [Conversations]
 *     summary: List messages in a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 50 }
 *     responses:
 *       200: { description: OK }
 */
conversationsRoutes.get("/:id/messages", requireAuth, async (req, res, next) => {
    try {
        const convoId = ensureObjectId(String(req.params.id), "Conversation not found");
        await assertParticipant(convoId, req.auth!.sub);

        const q = MessageListQuerySchema.parse(req.query);
        const skip = (q.page - 1) * q.limit;

        const [items, total] = await Promise.all([
            MessageModel.find({ conversationId: convoId })
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(q.limit)
                .lean(),
            MessageModel.countDocuments({ conversationId: convoId }),
        ]);

        res.json({ items, page: q.page, limit: q.limit, total });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/conversations/{id}/messages:
 *   post:
 *     tags: [Conversations]
 *     summary: Send a message
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *     responses:
 *       201: { description: Created }
 */
conversationsRoutes.post(
    "/:id/messages",
    requireAuth,
    validateBody(CreateMessageSchema),
    async (req, res, next) => {
        try {
            const convoId = ensureObjectId(String(req.params.id), "Conversation not found");
            await assertParticipant(convoId, req.auth!.sub);

            const messageDoc = await MessageModel.create({
                conversationId: convoId,
                senderId: new mongoose.Types.ObjectId(req.auth!.sub),
                text: req.body.text,
            });
            const message = messageDoc.toObject();

            const convo = await ConversationModel.findByIdAndUpdate(
                convoId,
                { $set: { lastMessageAt: new Date() } },
                { new: true },
            ).lean();

            if (convo) {
                const recipients = convo.participants.filter(
                    (id) => id.toString() !== req.auth!.sub,
                );
                if (recipients.length > 0) {
                    const booking = convo.bookingId
                        ? await BookingModel.findById(convo.bookingId).lean()
                        : null;
                    let vendorUserId: string | null = null;
                    if (booking) {
                        const vendor = await VendorModel.findById(booking.vendorId).lean();
                        vendorUserId = vendor?.userId?.toString() ?? null;
                    }

                    for (const recipient of recipients) {
                        const recipientId = recipient.toString();
                        const isVendor = vendorUserId && recipientId === vendorUserId;
                        const link = booking
                            ? isVendor
                                ? `/vendor/bookings/${booking._id.toString()}`
                                : `/customer/bookings/${booking._id.toString()}`
                            : "/messages";
                        await createNotification({
                            userId: recipientId,
                            type: NotificationType.MESSAGE,
                            title: "New message",
                            body: "You have a new message.",
                            link,
                        });
                    }
                }
            }

            emitMessage(convoId.toString(), message);
            res.status(201).json(message);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/conversations/{id}/read:
 *   post:
 *     tags: [Conversations]
 *     summary: Mark messages as read
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
conversationsRoutes.post("/:id/read", requireAuth, async (req, res, next) => {
    try {
        const convoId = ensureObjectId(String(req.params.id), "Conversation not found");
        await assertParticipant(convoId, req.auth!.sub);

        const result = await MessageModel.updateMany(
            {
                conversationId: convoId,
                senderId: { $ne: req.auth!.sub },
                readAt: { $exists: false },
            },
            { $set: { readAt: new Date() } },
        );

        res.json({ updated: result.modifiedCount });
    } catch (err) {
        next(err);
    }
});
