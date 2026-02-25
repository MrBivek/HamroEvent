import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { EventModel } from "./event.model.js";
import { CreateEventSchema, UpdateEventSchema, EventListQuerySchema } from "./events.schemas.js";
import { BookingModel } from "../bookings/booking.model.js";
import { PackageModel } from "../packages/package.model.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { CategoryModel } from "../categories/category.model.js";
import { buildEventDto } from "../../common/dtos.js";
import { mapBookingStatusToUi } from "../../common/mappers.js";
import { normalizeTimeRange } from "../../common/time.js";

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
 *             required: [title, eventType]
 *             properties:
 *               title: { type: string, example: "Wedding Event" }
 *               eventType: { type: string, example: "Wedding" }
 *               eventDate: { type: string, example: "2026-02-01T00:00:00.000Z" }
 *               date: { type: string, example: "2026-02-01" }
 *               startTime: { type: string, example: "10:00" }
 *               endTime: { type: string, example: "16:00" }
 *               locationText: { type: string, example: "Kathmandu, Baneshwor" }
 *               location: { type: string, example: "Kathmandu" }
 *               guestCount: { type: number, example: 250 }
 *               budgetMin: { type: number, example: 50000 }
 *               budgetMax: { type: number, example: 150000 }
 *               budget: { type: number, example: 100000 }
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
      const dateValue = body.eventDate ?? body.date;
      if (!dateValue) throw new BadRequestError("Event date is required");
      body.eventDate = new Date(dateValue);
      body.locationText = body.locationText ?? body.location;
      if (typeof body.budget === "number") {
        body.budgetMin = body.budget;
        body.budgetMax = body.budget;
      }
      if (body.startTime || body.endTime) {
        const range = normalizeTimeRange(body.startTime, body.endTime);
        if (!range) {
          throw new BadRequestError("Invalid time range. Use HH:mm and ensure end is after start.");
        }
      }

      if (body.locationId && mongoose.isValidObjectId(body.locationId)) {
        body.locationId = new mongoose.Types.ObjectId(body.locationId);
      } else {
        delete body.locationId;
      }

      const event = await EventModel.create(body);
      res.status(201).json(buildEventDto(event));
    } catch (err) {
      next(err);
    }
  },
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

    const eventIds = items.map((event) => event._id);
    const counts = await BookingModel.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const mapped = items.map((event) =>
      buildEventDto(event, countMap.get(event._id.toString()) ?? 0),
    );

    res.json({ items: mapped, page: q.page, limit: q.limit, total });
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
    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Event not found");

    const event = await EventModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(req.auth!.sub),
    }).lean();

    if (!event) throw new NotFoundError("Event not found");

    const bookings = await BookingModel.find({ eventId: event._id }).lean();
    const vendorIds = bookings.map((b) => b.vendorId);
    const packageIds = bookings
      .map((b) => b.packageId)
      .filter(Boolean) as mongoose.Types.ObjectId[];

    const [vendors, packages] = await Promise.all([
      VendorModel.find({ _id: { $in: vendorIds } }).lean(),
      packageIds.length
        ? PackageModel.find({ _id: { $in: packageIds } }).lean()
        : Promise.resolve([]),
    ]);
    const categoryIds = vendors
      .map((v) => v.categoryId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const categories = categoryIds.length
      ? await CategoryModel.find({ _id: { $in: categoryIds } }).lean()
      : [];

    const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));
    const packageMap = new Map(packages.map((p) => [p._id.toString(), p]));
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.slug]));

    const bookingDtos = bookings.map((booking) => {
      const vendor = vendorMap.get(booking.vendorId.toString());
      const pkg = booking.packageId ? packageMap.get(booking.packageId.toString()) : undefined;
      const categorySlug = vendor?.categoryId ? categoryMap.get(vendor.categoryId.toString()) : "";
      return {
        id: booking._id.toString(),
        vendorName: vendor?.businessName ?? "",
        category: categorySlug ?? "",
        status: mapBookingStatusToUi(booking.status),
        price: pkg?.priceMin ?? 0,
      };
    });

    res.json({ ...buildEventDto(event), bookings: bookingDtos });
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
      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Event not found");

      const updates: any = { ...req.body };

      if (updates.date && !updates.eventDate) updates.eventDate = updates.date;
      if (updates.eventDate) updates.eventDate = new Date(updates.eventDate);
      if (updates.location) {
        updates.locationText = updates.location;
        delete updates.location;
      }
      if (typeof updates.budget === "number") {
        updates.budgetMin = updates.budget;
        updates.budgetMax = updates.budget;
      }

      if ("locationId" in updates) {
        if (updates.locationId && mongoose.isValidObjectId(updates.locationId)) {
          updates.locationId = new mongoose.Types.ObjectId(updates.locationId);
        } else {
          delete updates.locationId;
        }
      }
      if ("startTime" in updates || "endTime" in updates) {
        const start = updates.startTime ?? null;
        const end = updates.endTime ?? null;
        const range = normalizeTimeRange(start, end);
        if (!range) {
          throw new BadRequestError("Invalid time range. Use HH:mm and ensure end is after start.");
        }
      }

      const event = await EventModel.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(req.auth!.sub),
        },
        { $set: updates },
        { new: true },
      ).lean();

      if (!event) throw new NotFoundError("Event not found");
      res.json(buildEventDto(event));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete an event (Customer only)
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
eventsRoutes.delete("/:id", requireAuth, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Event not found");

    const result = await EventModel.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(req.auth!.sub),
    });
    if (result.deletedCount !== 1) throw new NotFoundError("Event not found");
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});
