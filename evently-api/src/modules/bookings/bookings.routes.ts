import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, BookingStatus } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { BookingModel } from "./booking.model.js";
import { CreateBookingSchema, BookingListQuerySchema } from "./bookings.schemas.js";
import { EventModel } from "../events/event.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { PackageModel } from "../packages/package.model.js";

export const bookingsRoutes = Router();

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a booking request (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendorId, eventId]
 *             properties:
 *               vendorId: { type: string }
 *               packageId: { type: string }
 *               eventId: { type: string }
 *               customerNote: { type: string }
 *     responses:
 *       201: { description: Created }
 */
bookingsRoutes.post(
    "/",
    requireAuth,
    requireRole(UserRole.CUSTOMER),
    validateBody(CreateBookingSchema),
    async (req, res, next) => {
        try {
            const userId = new mongoose.Types.ObjectId(req.auth!.sub);
            const { vendorId, packageId, eventId, customerNote } = req.body;

            if (!mongoose.isValidObjectId(vendorId)) throw new BadRequestError("Invalid vendorId");
            if (!mongoose.isValidObjectId(eventId)) throw new BadRequestError("Invalid eventId");
            if (packageId && !mongoose.isValidObjectId(packageId)) throw new BadRequestError("Invalid packageId");

            // verify event belongs to customer
            const event = await EventModel.findOne({ _id: eventId, userId }).lean();
            if (!event) throw new NotFoundError("Event not found");

            // verify vendor exists
            const vendor = await VendorModel.findById(vendorId).lean();
            if (!vendor) throw new NotFoundError("Vendor not found");

            // if packageId provided, validate it belongs to vendor
            if (packageId) {
                const pkg = await PackageModel.findOne({ _id: packageId, vendorId }).lean();
                if (!pkg) throw new NotFoundError("Package not found for this vendor");
            }

            const booking = await BookingModel.create({
                userId,
                vendorId: new mongoose.Types.ObjectId(vendorId),
                packageId: packageId ? new mongoose.Types.ObjectId(packageId) : undefined,
                eventId: new mongoose.Types.ObjectId(eventId),
                status: BookingStatus.REQUESTED,
                customerNote,
                requestedAt: new Date(),
            });

            res.status(201).json(booking);
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: List my bookings (Customer only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20 }
 *     responses:
 *       200: { description: OK }
 */
bookingsRoutes.get("/", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
    try {
        const q = BookingListQuerySchema.parse(req.query);
        const userId = new mongoose.Types.ObjectId(req.auth!.sub);
        const skip = (q.page - 1) * q.limit;

        const filter: any = { userId };
        if (q.status) filter.status = q.status;

        const [items, total] = await Promise.all([
            BookingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
            BookingModel.countDocuments(filter),
        ]);

        res.json({ items, page: q.page, limit: q.limit, total });
    } catch (err) {
        next(err);
    }
});

/**
 * @openapi
 * /api/bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get a booking (Customer only)
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
bookingsRoutes.get("/:id", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Booking not found");

        const booking = await BookingModel.findOne({
            _id: new mongoose.Types.ObjectId(id),
            userId: new mongoose.Types.ObjectId(req.auth!.sub),
        }).lean();

        if (!booking) throw new NotFoundError("Booking not found");
        res.json(booking);
    } catch (err) {
        next(err);
    }
});
