import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole } from "../../common/enums.js";
import { NotFoundError } from "../../common/errors.js";
import { EventModel } from "./event.model.js";
import { CreateEventSchema, UpdateEventSchema, EventListQuerySchema } from "./events.schemas.js";

export const eventsRoutes = Router();

/**
 * @openapi
 * /api/events:
 *   post:
 *     tags: [Events]
 *     summary: Create an event (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, eventType, eventDate]
 *             properties:
 *               title: { type: string, example: "Wedding Event" }
 *               eventType: { type: string, example: "WEDDING" }
 *               eventDate: { type: string, example: "2026-02-01T00:00:00.000Z" }
 *               startTime: { type: string, example: "10:00" }
 *               endTime: { type: string, example: "16:00" }
 *               locationText: { type: string, example: "Kathmandu, Baneshwor" }
 *               guestCount: { type: number, example: 250 }
 *               budgetMin: { type: number, example: 50000 }
 *               budgetMax: { type: number, example: 150000 }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Created }
 */
eventsRoutes.post(
    "/",
    requireAuth,
    requireRole(UserRole.CUSTOMER),
    validateBody(CreateEventSchema),
    async (req, res, next) => {
        try {
            const body: any = { ...req.body };

            body.userId = new mongoose.Types.ObjectId(req.auth!.sub);
            body.eventDate = new Date(body.eventDate);

            if (body.locationId && mongoose.isValidObjectId(body.locationId)) {
                body.locationId = new mongoose.Types.ObjectId(body.locationId);
            } else {
                delete body.locationId;
            }

            const event = await EventModel.create(body);
            res.status(201).json(event);
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @openapi
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: List my events (Customer only)
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
eventsRoutes.get("/", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
    try {
        const q = EventListQuerySchema.parse(req.query);
        const skip = (q.page - 1) * q.limit;

        const filter = { userId: new mongoose.Types.ObjectId(req.auth!.sub) };

        const [items, total] = await Promise.all([
            EventModel.find(filter).sort({ eventDate: -1 }).skip(skip).limit(q.limit).lean(),
            EventModel.countDocuments(filter),
        ]);

        res.json({ items, page: q.page, limit: q.limit, total });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Get an event (Customer only)
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
eventsRoutes.get("/:id", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Event not found");

        const event = await EventModel.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(req.auth!.sub),
        }).lean();

        if (!event) throw new NotFoundError("Event not found");
        res.json(event);
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/events/{id}:
 *   patch:
 *     tags: [Events]
 *     summary: Update an event (Customer only)
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
eventsRoutes.patch(
    "/:id",
    requireAuth,
    requireRole(UserRole.CUSTOMER),
    validateBody(UpdateEventSchema),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Event not found");

            const updates: any = { ...req.body };

            if (updates.eventDate) updates.eventDate = new Date(updates.eventDate);

            if ("locationId" in updates) {
                if (updates.locationId && mongoose.isValidObjectId(updates.locationId)) {
                    updates.locationId = new mongoose.Types.ObjectId(updates.locationId);
                } else {
                    delete updates.locationId;
                }
            }

            const event = await EventModel.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(req.auth!.sub) },
                { $set: updates },
                { new: true }
            ).lean();

            if (!event) throw new NotFoundError("Event not found");
            res.json(event);
        } catch (err) {
            next(err);
        }
    }
);
