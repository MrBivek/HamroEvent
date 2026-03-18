import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { UserRole, BookingStatus, NotificationType } from "../../common/enums.js";
import { BadRequestError, NotFoundError } from "../../common/errors.js";
import { VendorModel } from "../vendors/vendor.model.js";
import { BookingModel } from "./booking.model.js";
import { QuoteModel } from "../quotes/quote.model.js";
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
import { resolveVendorForUser } from "../../common/vendor.js";
import { emitBookingUpdate } from "../../socket.js";
import {
    normalizeEventRangeForConflict,
    normalizeTimeRange,
    parseTimeToMinutes,
    rangeWithinSlot,
    rangesOverlap,
} from "../../common/time.js";

export const vendorBookingsRoutes = Router();

function startOfDayUtc(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfDayUtc(date: Date) {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
    );
}

function resolveEventEndUtc(eventDate?: Date | null, endTime?: string | null) {
    if (!eventDate) return null;
    const endMinutes = parseTimeToMinutes(endTime);
    if (endMinutes === null) return endOfDayUtc(eventDate);
    const hours = Math.floor(endMinutes / 60);
    const minutes = endMinutes % 60;
    return new Date(
        Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate(), hours, minutes, 0, 0),
    );
}

/**
 * NOTE:
 * Mount this under:
 *   apiRouter.use("/vendors", vendorBookingsRoutes);
 * Final paths:
 *   /api/vendors/me/bookings
 *   /api/vendors/me/bookings/:id/decision
 *   /api/vendors/me/bookings/:id/complete
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

            const vendor = await resolveVendorForUser(req.auth!.sub, { lean: true });
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
            const packageIds = items
                .map((b) => b.packageId)
                .filter(Boolean) as mongoose.Types.ObjectId[];
            const userIds = items.map((b) => b.userId);

            const [events, packages, users, quotes] = await Promise.all([
                EventModel.find({ _id: { $in: eventIds } }).lean(),
                packageIds.length
                    ? PackageModel.find({ _id: { $in: packageIds } }).lean()
                    : Promise.resolve([]),
                UserModel.find({ _id: { $in: userIds } }).lean(),
                QuoteModel.find({ bookingId: { $in: items.map((b) => b._id) } })
                    .select({ bookingId: 1 })
                    .lean(),
            ]);

            const eventMap = new Map(events.map((e) => [e._id.toString(), e]));
            const packageMap = new Map(packages.map((p) => [p._id.toString(), p]));
            const userMap = new Map(users.map((u) => [u._id.toString(), u]));

            const quoteSet = new Set(quotes.map((q) => q.bookingId.toString()));
            const enriched = items.map((booking) => {
                const event = eventMap.get(booking.eventId.toString());
                const pkg = booking.packageId
                    ? packageMap.get(booking.packageId.toString())
                    : undefined;
                const customer = userMap.get(booking.userId.toString());
                const dto = buildBookingDto({
                    booking,
                    event,
                    customer,
                    packageTitle: pkg?.title,
                    packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
                    packageInclusions: pkg?.includes ?? [],
                });
                return { ...dto, hasQuote: quoteSet.has(booking._id.toString()) };
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
            const vendor = await resolveVendorForUser(req.auth!.sub, { lean: true });
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Booking not found");

            const booking = await BookingModel.findOne({ _id: id, vendorId: vendor._id }).lean();
            if (!booking) throw new NotFoundError("Booking not found");

            const [event, pkg, customer, quote] = await Promise.all([
                EventModel.findById(booking.eventId).lean(),
                booking.packageId
                    ? PackageModel.findById(booking.packageId).lean()
                    : Promise.resolve(null),
                UserModel.findById(booking.userId).lean(),
                QuoteModel.findOne({ bookingId: booking._id }).lean(),
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

            const dto = buildBookingDto({
                booking,
                event,
                customer,
                packageTitle: pkg?.title,
                packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
                packageInclusions: pkg?.includes ?? [],
                messages,
                messageRoleMap,
            });
            res.json({ ...dto, hasQuote: Boolean(quote) });
        } catch (err) {
            next(err);
        }
    },
);

/**
 * @openapi
 * /api/vendors/me/bookings/{id}/complete:
 *   patch:
 *     tags: [Vendor Bookings]
 *     summary: Mark a booking as completed (Vendor only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       400: { description: Validation error }
 *       404: { description: Not found }
 */
vendorBookingsRoutes.patch(
    "/me/bookings/:id/complete",
    requireAuth,
    requireRole(UserRole.VENDOR),
    async (req, res, next) => {
        try {
            const vendor = await resolveVendorForUser(req.auth!.sub, { lean: true });
            if (!vendor) throw new NotFoundError("Vendor profile not found");

            const id = String(req.params.id);
            if (!mongoose.isValidObjectId(id)) throw new NotFoundError("Booking not found");

            const booking = await BookingModel.findOne({ _id: id, vendorId: vendor._id });
            if (!booking) throw new NotFoundError("Booking not found");

            if (
                booking.status === BookingStatus.CANCELLED ||
                booking.status === BookingStatus.REJECTED
            ) {
                throw new BadRequestError("This booking cannot be completed");
            }

            if (booking.status === BookingStatus.COMPLETED) {
                return res.json(booking.toObject());
            }

            if (
                booking.status !== BookingStatus.ACCEPTED &&
                booking.status !== BookingStatus.CONFIRMED &&
                booking.status !== BookingStatus.CONFIRMED_PENDING_PAYMENT
            ) {
                throw new BadRequestError("Booking is not eligible for completion");
            }

            const event = await EventModel.findById(booking.eventId).lean();
            if (!event) throw new NotFoundError("Event not found");

            const eventEnd = resolveEventEndUtc(event.eventDate, event.endTime);
            if (!eventEnd) throw new BadRequestError("Event date is missing");

            if (new Date() < eventEnd) {
                throw new BadRequestError("Event has not ended yet");
            }

            booking.status = BookingStatus.COMPLETED;
            const history = (booking.history ?? []) as any[];
            history.push({
                status: "completed",
                byRole: "vendor",
                at: new Date(),
                note: "Event marked completed",
            });
            booking.history = history as any;
            await booking.save();

            const [pkg, customer] = await Promise.all([
                booking.packageId
                    ? PackageModel.findById(booking.packageId).lean()
                    : Promise.resolve(null),
                UserModel.findById(booking.userId).lean(),
            ]);

            const dto = buildBookingDto({
                booking: booking.toObject(),
                event,
                customer,
                packageTitle: pkg?.title,
                packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
                packageInclusions: pkg?.includes ?? [],
            });

            await createNotification({
                userId: booking.userId.toString(),
                type: NotificationType.BOOKING_COMPLETED,
                title: "Event completed",
                body: "Your event has been marked as completed. You can now leave a review.",
                link: `/customer/bookings/${booking._id.toString()}`,
            });

            emitBookingUpdate([booking.userId.toString(), vendor.userId.toString()], {
                bookingId: booking._id.toString(),
                bookingStatus: dto.status,
                history: dto.history,
            });

            res.json(dto);
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
            const vendor = await resolveVendorForUser(req.auth!.sub, { lean: true });
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
                const quote = await QuoteModel.findOne({ bookingId: booking._id }).lean();
                if (!quote) {
                    throw new BadRequestError(
                        "Please submit a proposal before accepting this booking",
                    );
                }
                const event = await EventModel.findById(booking.eventId).lean();
                if (!event) throw new NotFoundError("Event not found");

                const date = startOfDayUtc(new Date(event.eventDate));
                const endDate = endOfDayUtc(new Date(event.eventDate));
                const availability = await AvailabilityModel.findOne({
                    vendorId: vendor._id,
                    date,
                }).lean();
                if (availability && availability.isAvailable === false) {
                    throw new BadRequestError("Vendor is not available on the event date");
                }
                if (availability && availability.slots && availability.slots.length > 0) {
                    const eventRange = normalizeTimeRange(event.startTime, event.endTime);
                    if (!eventRange) {
                        throw new BadRequestError(
                            "Event time range is required for this vendor on the selected date",
                        );
                    }
                    const fits = availability.slots.some((slot) =>
                        rangeWithinSlot(eventRange, slot.start, slot.end),
                    );
                    if (!fits) {
                        throw new BadRequestError(
                            "Event time is outside the vendor's available slots",
                        );
                    }
                }

                const eventsOnDate = await EventModel.find(
                    { eventDate: { $gte: date, $lte: endDate } },
                    { _id: 1 },
                ).lean();
                const eventIds = eventsOnDate.map((e) => e._id);
                if (eventIds.length > 0) {
                    const conflictingBookings = await BookingModel.find({
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
                    }).lean();

                    if (conflictingBookings.length > 0) {
                        const otherEventIds = Array.from(
                            new Set(conflictingBookings.map((b) => b.eventId.toString())),
                        ).map((id) => new mongoose.Types.ObjectId(id));
                        const otherEvents = await EventModel.find({
                            _id: { $in: otherEventIds },
                        }).lean();
                        const eventMap = new Map(otherEvents.map((e) => [e._id.toString(), e]));

                        const currentRange = normalizeEventRangeForConflict(
                            event.startTime,
                            event.endTime,
                        );
                        for (const other of conflictingBookings) {
                            const otherEvent = eventMap.get(other.eventId.toString());
                            if (!otherEvent) {
                                throw new BadRequestError(
                                    "Booking conflicts with an existing confirmed booking",
                                );
                            }
                            const otherRange = normalizeEventRangeForConflict(
                                otherEvent.startTime,
                                otherEvent.endTime,
                            );
                            if (rangesOverlap(currentRange, otherRange)) {
                                throw new BadRequestError(
                                    "Booking conflicts with an existing confirmed booking",
                                );
                            }
                        }
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
                booking.packageId
                    ? PackageModel.findById(booking.packageId).lean()
                    : Promise.resolve(null),
                UserModel.findById(booking.userId).lean(),
            ]);

            const dto = buildBookingDto({
                booking: booking.toObject(),
                event,
                customer,
                packageTitle: pkg?.title,
                packagePrice: typeof pkg?.priceMin === "number" ? pkg.priceMin : undefined,
            });

            emitBookingUpdate([booking.userId.toString(), vendor.userId.toString()], {
                bookingId: booking._id.toString(),
                bookingStatus: dto.status,
                history: dto.history,
            });

            res.json(dto);
        } catch (err) {
            next(err);
        }
    },
);
