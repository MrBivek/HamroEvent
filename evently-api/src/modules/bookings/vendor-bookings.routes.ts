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
import { PackageModel } from "../packages/package.model.js";
import { UserModel } from "../auth/user.model.js";
import { buildBookingDto } from "../../common/dtos.js";
import { mapUiBookingStatusToInternal } from "../../common/mappers.js";
import { ConversationModel } from "../conversations/conversation.model.js";
import { MessageModel } from "../conversations/message.model.js";

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
      if (q.status) {
        const internal = mapUiBookingStatusToInternal(q.status);
        if (internal) filter.status = internal;
      }

      const [items, total] = await Promise.all([
        BookingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(q.limit).lean(),
        BookingModel.countDocuments(filter),
      ]);

      const eventIds = items.map((b) => b.eventId);
      const packageIds = items.map((b) => b.packageId).filter(Boolean) as mongoose.Types.ObjectId[];
      const userIds = items.map((b) => b.userId);

      const [events, packages, users] = await Promise.all([
        EventModel.find({ _id: { $in: eventIds } }).lean(),
        packageIds.length
          ? PackageModel.find({ _id: { $in: packageIds } }).lean()
          : Promise.resolve([]),
        UserModel.find({ _id: { $in: userIds } }).lean(),
      ]);

      const eventMap = new Map(events.map((e) => [e._id.toString(), e]));
      const packageMap = new Map(packages.map((p) => [p._id.toString(), p]));
      const userMap = new Map(users.map((u) => [u._id.toString(), u]));

      const enriched = items.map((booking) => {
        const event = eventMap.get(booking.eventId.toString());
        const pkg = booking.packageId ? packageMap.get(booking.packageId.toString()) : undefined;
        const customer = userMap.get(booking.userId.toString());
        return buildBookingDto({
          booking,
          event,
          customer,
          packageTitle: pkg?.title,
          packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
        });
      });

      res.json({ items: enriched, page: q.page, limit: q.limit, total });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/vendors/me/bookings/{id}:
 *   get:
 *     tags: [Vendor Bookings]
 *     summary: Get a booking (Vendor only)
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
vendorBookingsRoutes.get(
  "/me/bookings/:id",
  requireAuth,
  requireRole(UserRole.VENDOR),
  async (req, res, next) => {
    try {
      const vendor = await VendorModel.findOne({ userId: req.auth!.sub }).lean();
      if (!vendor) throw new NotFoundError("Vendor profile not found");

      const id = String(req.params.id);
      if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Booking not found");

      const booking = await BookingModel.findOne({ _id: id, vendorId: vendor._id }).lean();
      if (!booking) throw new NotFoundError("Booking not found");

      const [event, pkg, customer] = await Promise.all([
        EventModel.findById(booking.eventId).lean(),
        booking.packageId ? PackageModel.findById(booking.packageId).lean() : Promise.resolve(null),
        UserModel.findById(booking.userId).lean(),
      ]);

      const conversation = await ConversationModel.findOne({ bookingId: booking._id }).lean();
      const messages = conversation
        ? await MessageModel.find({ conversationId: conversation._id })
            .sort({ createdAt: 1 })
            .lean()
        : [];
      const messageRoleMap = new Map<string, string>();
      messageRoleMap.set(booking.userId.toString(), "customer");
      messageRoleMap.set(vendor.userId.toString(), "vendor");

      res.json(
        buildBookingDto({
          booking,
          event,
          customer,
          packageTitle: pkg?.title,
          packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
          messages,
          messageRoleMap,
        }),
      );
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
        const history = (booking.history ?? []) as any[];
        history.push({
          status: "accepted",
          byRole: "vendor",
          at: new Date(),
          note: "Vendor accepted the booking",
        });
        booking.history = history as any;
      } else {
        booking.status = BookingStatus.REJECTED;
        booking.rejectReason = req.body.rejectReason || "Rejected by vendor";
        const history = (booking.history ?? []) as any[];
        history.push({
          status: "rejected",
          byRole: "vendor",
          at: new Date(),
          note: booking.rejectReason,
        });
        booking.history = history as any;
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

      const [event, pkg, customer] = await Promise.all([
        EventModel.findById(booking.eventId).lean(),
        booking.packageId ? PackageModel.findById(booking.packageId).lean() : Promise.resolve(null),
        UserModel.findById(booking.userId).lean(),
      ]);

      res.json(
        buildBookingDto({
          booking: booking.toObject(),
          event,
          customer,
          packageTitle: pkg?.title,
          packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);
