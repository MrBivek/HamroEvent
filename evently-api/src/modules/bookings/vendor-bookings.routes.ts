import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, BookingStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { BookingModel } from "./booking.model.js";
import { VendorDecisionSchema, BookingListQuerySchema } from "./bookings.schemas.js";
import { AvailabilityModel } from "../availability/availability.model.js";
import { EventModel } from "../events/event.model.js";
import { createNotification } from "../notifications/notifications.service.js";
import { createAuditLog } from "../audit-logs/audit-logs.service.js";

export const vendorBookingsRoutes = Router();

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfDayUtc(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

/**
 * NOTE:
 * Mount this under:
 *   apiRouter.use("/vendors", vendorBookingsRoutes);
 * Final paths:
 *   /api/vendors/me/bookings
 *   /api/vendors/me/bookings/:id/decision
 */

/**
 * @openapi
 * /api/vendors/me/bookings:
 *   get:
 *     tags: [Vendor Bookings]
 *     summary: Vendor inbox - list bookings for my vendor (Vendor only)
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
vendorBookingsRoutes.get(
  "/me/bookings",
  requireAuth,
  requireRole(UserRole.VENDOR),
  async (req, res, next) => {
    try {
      const q = BookingListQuerySchema.parse(req.query);

      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const skip = (q.page - 1) * q.limit;

      const filter: any = { vendorId: vendor._id };
      if (q.status) filter.status = q.status;

      const [items, total] = await Promise.all([
        BookingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
        BookingModel.countDocuments(filter),
      ]);

      res.json({ items, page: q.page, limit: q.limit, total });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/vendors/me/bookings/{id}/decision:
 *   patch:
 *     tags: [Vendor Bookings]
 *     summary: Accept or reject a booking request (Vendor only)
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
 *             required: [decision]
 *             properties:
 *               decision: { type: string, enum: [ACCEPT, REJECT] }
 *               vendorNote: { type: string }
 *               rejectReason: { type: string }
 *     responses:
 *       200: { description: OK }
 *       400: { description: Invalid transition }
 *       404: { description: Booking not found }
 */
vendorBookingsRoutes.patch(
  "/me/bookings/:id/decision",
  requireAuth,
  requireRole(UserRole.VENDOR),
  validateBody(VendorDecisionSchema),
  async (req, res, next) => {
    try {
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Booking not found");

      const booking = await BookingModel.findOne({ _id: id, vendorId: vendor._id });
      if (!booking) throw new NotFoundError("Booking not found");

      if (booking.status !== BookingStatus.REQUESTED) {
        throw new BadRequestError("Only REQUESTED bookings can be accepted/rejected");
      }

      const decision = req.body.decision;
      booking.vendorNote = req.body.vendorNote;
      booking.decisionAt = new Date();

      if (decision === "ACCEPT") {
        const event = await EventModel.findById(booking.eventId).lean();
        if (!event) throw new NotFoundError("Event not found");

        const date = startOfDayUtc(new Date(event.eventDate));
        const endDate = endOfDayUtc(new Date(event.eventDate));
        const availability = await AvailabilityModel.findOne({ vendorId: vendor._id, date }).lean();
        if (!availability || availability.isAvailable === false) {
          throw new BadRequestError("Vendor is not available on the event date");
        }

        const eventsOnDate = await EventModel.find(
          { eventDate: { $gte: date, $lte: endDate } },
          { _id: 1 },
        ).lean();
        const eventIds = eventsOnDate.map((e) => e._id);
        if (eventIds.length > 0) {
          const conflictCount = await BookingModel.countDocuments({
            _id: { $ne: booking._id },
            vendorId: vendor._id,
            eventId: { $in: eventIds },
            status: {
              $in: [
                BookingStatus.ACCEPTED,
                BookingStatus.CONFIRMED_PENDING_PAYMENT,
                BookingStatus.CONFIRMED,
                BookingStatus.COMPLETED,
              ],
            },
          });

          if (conflictCount > 0) {
            throw new BadRequestError("Booking conflicts with an existing confirmed booking");
          }
        }

        booking.status = BookingStatus.ACCEPTED;
        booking.rejectReason = undefined;
      } else {
        booking.status = BookingStatus.REJECTED;
        booking.rejectReason = req.body.rejectReason || "Rejected by vendor";
      }

      await booking.save();

      await createAuditLog({
        actorUserId: req.auth!.sub,
        action: "BOOKING_DECISION",
        targetType: "Booking",
        targetId: booking._id,
        metadata: { decision, vendorId: vendor._id.toString() },
      });

      const notificationType =
        decision === "ACCEPT"
          ? NotificationType.BOOKING_ACCEPTED
          : NotificationType.BOOKING_REJECTED;
      await createNotification({
        userId: booking.userId.toString(),
        type: notificationType,
        title: decision === "ACCEPT" ? "Booking accepted" : "Booking rejected",
        body:
          decision === "ACCEPT"
            ? "Your booking request was accepted."
            : "Your booking request was rejected.",
        link: `/customer/bookings/${booking._id.toString()}`,
      });

      res.json(booking.toObject());
    } catch (err) {
      next(err);
    }
  },
);
