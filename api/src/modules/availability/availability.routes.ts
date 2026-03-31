import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, BookingStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { AvailabilityModel } from "./availability.model.js";
import { AvailabilityListQuerySchema, UpsertAvailabilitySchema } from "./availability.schemas.js";
import { BookingModel } from "../bookings/booking.model.js";
import { EventModel } from "../events/event.model.js";
import { resolveVendorForUser } from "../../common/vendor.js";

export const availabilityRoutes = Router();

function parseDateOnly(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new BadRequestError("Invalid date format. Use YYYY-MM-DD");
    }
    const [y, m, d] = value.split("-").map((v) => Number(v));
    return new Date(Date.UTC(y, m - 1, d));
}

function startOfDayUtc(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfDayUtc(date: Date) {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
    );
}

async function hasBlockingBookings(vendorId: mongoose.Types.ObjectId, date: Date) {
    const start = startOfDayUtc(date);
    const end = endOfDayUtc(date);

    const events = await EventModel.find(
        { eventDate: { $gte: start, $lte: end } },
        { _id: 1 },
    ).lean();
    if (events.length === 0) return false;

    const eventIds = events.map((e) => e._id);
    const blockingStatuses = [
        BookingStatus.ACCEPTED,
        BookingStatus.CONFIRMED_PENDING_PAYMENT,
        BookingStatus.CONFIRMED,
        BookingStatus.COMPLETED,
    ];

    const count = await BookingModel.countDocuments({
        vendorId,
        eventId: { $in: eventIds },
        status: { $in: blockingStatuses },
    });

    return count > 0;
}

/**
 * @openapi
 * /api/vendors/me/availabilities:
 *   get:
 *     tags: [Availability]
 *     summary: List availability for date range (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, example: "2026-02-01" }
 *       - in: query
 *         name: to
 *         schema: { type: string, example: "2026-02-28" }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
availabilityRoutes.get(
    "/me/availabilities",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const q = AvailabilityListQuerySchema.parse(req.query);
            const vendor = await resolveVendorForUser(req.auth!.sub, { lean: true });
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const now = new Date();
            const defaultFrom = startOfDayUtc(now);
            const defaultTo = endOfDayUtc(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

            const from = q.from ? parseDateOnly(q.from) : defaultFrom;
            const to = q.to ? parseDateOnly(q.to) : defaultTo;

            const skip = (q.page - 1) * q.limit;
            const filter = { vendorId: vendor._id, date: { $gte: from, $lte: to } };

            const [items, total] = await Promise.all([
                AvailabilityModel.find(filter).sort({ date: 1 }).skip(skip).limit(q.limit).lean(),
                AvailabilityModel.countDocuments(filter),
            ]);

            res.json({ items, page: q.page, limit: q.limit, total, from, to });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/availability/{date}:
 *   put:
 *     tags: [Availability]
 *     summary: Set availability for a date (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema: { type: string, example: "2026-02-15" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAvailable: { type: boolean }
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     start: { type: string, example: "10:00" }
 *                     end: { type: string, example: "16:00" }
 *               note: { type: string }
 *     responses:
 *       200: { description: OK }
 *       400: { description: Conflict with confirmed bookings }
 */
availabilityRoutes.put(
    "/me/availability/:date",
    requireAuth,
    requireRole(UserRole.VENDOR),
    validateBody(UpsertAvailabilitySchema),
    async (req, res, next) => {
        try {
            const vendor = await resolveVendorForUser(req.auth!.sub, { lean: true });
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const date = parseDateOnly(String(req.params.date));

            if (req.body.isAvailable === false) {
                const hasBookings = await hasBlockingBookings(vendor._id, date);
                if (hasBookings) {
                    throw new BadRequestError(
                        "Cannot mark unavailable with confirmed bookings on that date",
                    );
                }
            }

            const updates: Record<string, unknown> = {};
            if (req.body.isAvailable !== undefined) updates.isAvailable = req.body.isAvailable;
            if (req.body.slots !== undefined) updates.slots = req.body.slots;
            if (req.body.note !== undefined) updates.note = req.body.note;

            if (Object.keys(updates).length === 0) {
                updates.isAvailable = true;
            }

            const doc = await AvailabilityModel.findOneAndUpdate(
                { vendorId: vendor._id, date },
                { $set: updates },
                { new: true, upsert: true },
            ).lean();

            res.json(doc);
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/availability/{date}:
 *   delete:
 *     tags: [Availability]
 *     summary: Remove availability for a date (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema: { type: string, example: "2026-02-15" }
 *     responses:
 *       200: { description: OK }
 */
availabilityRoutes.delete(
    "/me/availability/:date",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const vendor = await resolveVendorForUser(req.auth!.sub, { lean: true });
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const date = parseDateOnly(String(req.params.date));

            const hasBookings = await hasBlockingBookings(vendor._id, date);
            if (hasBookings) {
                throw new BadRequestError(
                    "Cannot remove availability with confirmed bookings on that date",
                );
            }

            const result = await AvailabilityModel.deleteOne({ vendorId: vendor._id, date });
            res.json({ deleted: result.deletedCount === 1 });
        } catch (err) {
            next(err);
        }
    },
);
